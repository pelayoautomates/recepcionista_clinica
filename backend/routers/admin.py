import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from database.client import get_supabase
from models.clinica import ClinicaCreate, ClinicaUpdate
from security import require_admin_key

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_admin_key)])


# ─── Clínicas ───────────────────────────────────────────────────────────────

@router.get("/clinicas")
async def listar_clinicas():
    db = get_supabase()
    result = db.table("clinicas").select(
        "id, nombre, telefono, whatsapp_number, email_contacto, horarios, servicios, google_tokens_enc, created_at"
    ).execute()
    # No devolver los tokens cifrados, solo indicar si existe
    for c in result.data:
        c["google_tokens_enc"] = bool(c.get("google_tokens_enc"))
    return result.data


@router.get("/clinicas/{clinic_id}")
async def obtener_clinica(clinic_id: UUID):
    db = get_supabase()
    result = db.table("clinicas").select(
        "id, nombre, telefono, telefono_ia, telnyx_number_id, whatsapp_number, "
        "email_contacto, horarios, servicios, prompt_personalizado, google_tokens_enc, "
        "url_web, especialidad, agente_nombre, notif_email, "
        "plan, trial_expires_at, minutos_incluidos, minutos_usados_mes, "
        "retell_agent_id, onboarding_ok, created_at"
    ).eq("id", str(clinic_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    # No devolver tokens cifrados, solo indicar si existe
    result.data["google_tokens_enc"] = bool(result.data.get("google_tokens_enc"))
    return result.data


@router.post("/clinicas")
async def crear_clinica(data: ClinicaCreate):
    db = get_supabase()
    result = db.table("clinicas").insert(data.model_dump(exclude_none=True)).execute()
    return result.data[0]


@router.patch("/clinicas/{clinic_id}")
async def actualizar_clinica(clinic_id: UUID, data: ClinicaUpdate):
    db = get_supabase()
    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    result = db.table("clinicas").update(updates).eq("id", str(clinic_id)).execute()
    return result.data[0]


# ─── Leads / Pacientes ───────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/leads")
async def listar_leads(clinic_id: UUID, estado: str | None = None, canal: str | None = None):
    from scoring import enriquecer_leads
    db = get_supabase()
    query = db.table("pacientes").select("*").eq("clinic_id", str(clinic_id))
    if estado:
        query = query.eq("estado_lead", estado)
    if canal:
        query = query.eq("canal_origen", canal)
    result = query.order("created_at", desc=True).execute()
    return enriquecer_leads(result.data)


# ─── Conversaciones ──────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/conversaciones")
async def listar_conversaciones(clinic_id: UUID, estado: str | None = None):
    db = get_supabase()
    query = db.table("conversaciones") \
        .select("id, paciente_id, canal, estado, mensajes, created_at, updated_at, pacientes(nombre)") \
        .eq("clinic_id", str(clinic_id))
    if estado:
        query = query.eq("estado", estado)
    result = query.order("updated_at", desc=True).execute()
    return result.data


@router.get("/clinicas/{clinic_id}/conversaciones/{conv_id}")
async def ver_conversacion(clinic_id: UUID, conv_id: UUID):
    db = get_supabase()
    result = db.table("conversaciones") \
        .select("*") \
        .eq("clinic_id", str(clinic_id)) \
        .eq("id", str(conv_id)) \
        .single() \
        .execute()
    return result.data


@router.patch("/clinicas/{clinic_id}/conversaciones/{conv_id}/resolver")
async def resolver_conversacion(clinic_id: UUID, conv_id: UUID):
    db = get_supabase()
    result = db.table("conversaciones") \
        .update({"estado": "resuelta"}) \
        .eq("id", str(conv_id)) \
        .eq("clinic_id", str(clinic_id)) \
        .execute()
    return result.data[0]


@router.post("/clinicas/{clinic_id}/conversaciones/{conv_id}/responder")
async def responder_manualmente(clinic_id: UUID, conv_id: UUID, body: dict):
    """Añade una respuesta manual del humano a la conversación."""
    from datetime import datetime, timezone
    db = get_supabase()

    conv = db.table("conversaciones") \
        .select("mensajes") \
        .eq("id", str(conv_id)) \
        .eq("clinic_id", str(clinic_id)) \
        .single() \
        .execute()

    mensajes = conv.data.get("mensajes") or []
    mensajes.append({
        "role": "assistant",
        "content": body.get("mensaje", ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "from_human": True,
    })

    result = db.table("conversaciones") \
        .update({
            "mensajes": mensajes,
            "estado": "activa",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }) \
        .eq("id", str(conv_id)) \
        .eq("clinic_id", str(clinic_id)) \
        .execute()
    return result.data[0]


# ─── Citas ───────────────────────────────────────────────────────────────────

_CITAS_CAMPOS = [
    "tipo_servicio", "fecha_inicio", "fecha_fin", "estado",
    "profesional", "profesional_id", "sala_id", "conversacion_id",
    "notas_internas", "color", "duracion_min",
    "paciente_nombre", "paciente_telefono", "origen",
]

_ORIGENES_VALIDOS = {"manual", "ia_llamada", "ia_whatsapp", "ia_chat", "google_calendar"}
_ESTADOS_VALIDOS = {"pendiente", "confirmada", "reprogramada", "completada", "cancelada", "no_asistio"}


def _check_conflicts(db, clinic_id: str, fecha_inicio: str, fecha_fin: str, profesional: str | None, exclude_id: str | None = None) -> bool:
    """Devuelve True si hay conflicto de horario para ese profesional."""
    if not profesional or not fecha_fin:
        return False
    query = (
        db.table("citas")
        .select("id")
        .eq("clinic_id", clinic_id)
        .eq("profesional", profesional)
        .not_.in_("estado", ["cancelada", "no_asistio"])
        .lt("fecha_inicio", fecha_fin)
        .gt("fecha_fin", fecha_inicio)
    )
    if exclude_id:
        query = query.neq("id", exclude_id)
    result = query.execute()
    return len(result.data) > 0


@router.get("/clinicas/{clinic_id}/citas")
async def listar_citas(
    clinic_id: UUID,
    fecha: str | None = None,
    fecha_inicio: str | None = None,
    fecha_fin: str | None = None,
    estado: str | None = None,
    profesional: str | None = None,
    origen: str | None = None,
):
    db = get_supabase()
    query = db.table("citas").select(
        "id, clinic_id, paciente_id, google_event_id, tipo_servicio, fecha_inicio, fecha_fin, "
        "estado, profesional, notas_internas, color, duracion_min, origen, "
        "paciente_nombre, paciente_telefono, created_at, updated_at, "
        "pacientes(nombre, telefono)"
    ).eq("clinic_id", str(clinic_id))
    if fecha:
        query = query.gte("fecha_inicio", f"{fecha}T00:00:00Z").lte("fecha_inicio", f"{fecha}T23:59:59Z")
    if fecha_inicio:
        query = query.gte("fecha_inicio", fecha_inicio)
    if fecha_fin:
        query = query.lte("fecha_inicio", fecha_fin)
    if estado:
        query = query.eq("estado", estado)
    if profesional:
        query = query.eq("profesional", profesional)
    if origen:
        query = query.eq("origen", origen)
    result = query.order("fecha_inicio").execute()
    return result.data


@router.post("/clinicas/{clinic_id}/citas")
async def crear_cita(clinic_id: UUID, data: dict):
    db = get_supabase()
    if not data.get("fecha_inicio"):
        raise HTTPException(status_code=400, detail="fecha_inicio es obligatorio")

    fecha_inicio = data["fecha_inicio"]
    fecha_fin = data.get("fecha_fin")
    profesional = data.get("profesional")

    # Calcular fecha_fin si no viene pero sí duracion_min
    if not fecha_fin and data.get("duracion_min"):
        from datetime import datetime, timedelta, timezone
        fi = datetime.fromisoformat(fecha_inicio.replace("Z", "+00:00"))
        fecha_fin = (fi + timedelta(minutes=int(data["duracion_min"]))).isoformat()
        data["fecha_fin"] = fecha_fin

    # Validar conflictos de horario
    if _check_conflicts(db, str(clinic_id), fecha_inicio, fecha_fin or "", profesional):
        raise HTTPException(
            status_code=409,
            detail=f"El profesional '{profesional}' ya tiene una cita en ese horario"
        )

    cita = {"clinic_id": str(clinic_id), "estado": data.get("estado", "confirmada")}
    for k in _CITAS_CAMPOS:
        if data.get(k) is not None:
            cita[k] = data[k]
    result = db.table("citas").insert(cita).execute()
    return result.data[0]


@router.patch("/clinicas/{clinic_id}/citas/{cita_id}")
async def actualizar_cita(clinic_id: UUID, cita_id: UUID, data: dict):
    db = get_supabase()
    updates = {k: v for k, v in data.items() if k in _CITAS_CAMPOS and v is not None}
    # Allow explicit null for notas_internas
    if "notas_internas" in data:
        updates["notas_internas"] = data["notas_internas"]
    if not updates:
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")

    # Validar conflictos si se cambia fecha o profesional
    if "fecha_inicio" in updates or "profesional" in updates:
        existing = db.table("citas").select("fecha_inicio, fecha_fin, profesional").eq("id", str(cita_id)).single().execute()
        if existing.data:
            fi = updates.get("fecha_inicio", existing.data["fecha_inicio"])
            ff = updates.get("fecha_fin", existing.data.get("fecha_fin", ""))
            prof = updates.get("profesional", existing.data.get("profesional"))
            if _check_conflicts(db, str(clinic_id), fi, ff or "", prof, exclude_id=str(cita_id)):
                raise HTTPException(
                    status_code=409,
                    detail=f"El profesional '{prof}' ya tiene una cita en ese horario"
                )

    result = db.table("citas").update(updates).eq("id", str(cita_id)).eq("clinic_id", str(clinic_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    return result.data[0]


@router.delete("/clinicas/{clinic_id}/citas/{cita_id}")
async def eliminar_cita(clinic_id: UUID, cita_id: UUID):
    db = get_supabase()
    db.table("citas").delete().eq("id", str(cita_id)).eq("clinic_id", str(clinic_id)).execute()
    return {"ok": True}


# ─── Profesionales ───────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/profesionales")
async def listar_profesionales(clinic_id: UUID):
    db = get_supabase()
    result = db.table("profesionales").select("*").eq("clinic_id", str(clinic_id)).eq("activo", True).order("orden").order("nombre").execute()
    return result.data


@router.post("/clinicas/{clinic_id}/profesionales")
async def crear_profesional(clinic_id: UUID, data: dict):
    db = get_supabase()
    if not data.get("nombre"):
        raise HTTPException(status_code=400, detail="nombre es obligatorio")
    prof = {
        "clinic_id": str(clinic_id),
        "nombre": data["nombre"],
        "color": data.get("color", "#2563eb"),
        "especialidad": data.get("especialidad"),
        "email": data.get("email"),
        "telefono": data.get("telefono"),
        "acepta_reservas_ia": data.get("acepta_reservas_ia", True),
        "prioridad": data.get("prioridad", 0),
        "activo": True,
        "orden": data.get("orden", 0),
    }
    result = db.table("profesionales").insert(prof).execute()
    return result.data[0]


@router.patch("/clinicas/{clinic_id}/profesionales/{prof_id}")
async def actualizar_profesional(clinic_id: UUID, prof_id: UUID, data: dict):
    db = get_supabase()
    campos = {k: v for k, v in data.items() if k in ["nombre", "color", "especialidad", "email", "telefono", "activo", "orden", "acepta_reservas_ia", "prioridad"] and v is not None}
    if not campos:
        raise HTTPException(status_code=400, detail="Sin datos")
    result = db.table("profesionales").update(campos).eq("id", str(prof_id)).eq("clinic_id", str(clinic_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profesional no encontrado")
    return result.data[0]


@router.delete("/clinicas/{clinic_id}/profesionales/{prof_id}")
async def eliminar_profesional(clinic_id: UUID, prof_id: UUID):
    db = get_supabase()
    db.table("profesionales").update({"activo": False}).eq("id", str(prof_id)).eq("clinic_id", str(clinic_id)).execute()
    return {"ok": True}


# ─── Bloques de agenda ────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/bloques")
async def listar_bloques(clinic_id: UUID, fecha_inicio: str | None = None, fecha_fin: str | None = None):
    db = get_supabase()
    query = db.table("bloques_agenda").select("*").eq("clinic_id", str(clinic_id))
    if fecha_inicio:
        query = query.gte("fecha_inicio", fecha_inicio)
    if fecha_fin:
        query = query.lte("fecha_inicio", fecha_fin)
    result = query.order("fecha_inicio").execute()
    return result.data


@router.post("/clinicas/{clinic_id}/bloques")
async def crear_bloque(clinic_id: UUID, data: dict):
    db = get_supabase()
    if not data.get("titulo") or not data.get("fecha_inicio") or not data.get("fecha_fin"):
        raise HTTPException(status_code=400, detail="titulo, fecha_inicio y fecha_fin son obligatorios")
    bloque = {
        "clinic_id": str(clinic_id),
        "titulo": data["titulo"],
        "fecha_inicio": data["fecha_inicio"],
        "fecha_fin": data["fecha_fin"],
        "tipo": data.get("tipo", "bloqueo"),
        "notas": data.get("notas"),
    }
    if data.get("profesional_id"):
        bloque["profesional_id"] = str(data["profesional_id"])
    if data.get("sala_id"):
        bloque["sala_id"] = str(data["sala_id"])
    # Compat: campo texto profesional (legacy)
    if data.get("profesional") and not data.get("profesional_id"):
        bloque["profesional"] = data["profesional"]
    result = db.table("bloques_agenda").insert(bloque).execute()
    return result.data[0]


@router.delete("/clinicas/{clinic_id}/bloques/{bloque_id}")
async def eliminar_bloque(clinic_id: UUID, bloque_id: UUID):
    db = get_supabase()
    db.table("bloques_agenda").delete().eq("id", str(bloque_id)).eq("clinic_id", str(clinic_id)).execute()
    return {"ok": True}


# ─── Servicios ────────────────────────────────────────────────────────────────

_SERVICIOS_CAMPOS = [
    "nombre", "duracion_min", "color", "descripcion", "activo", "orden",
    "precio", "buffer_antes_min", "buffer_despues_min", "reservable_ia",
    "requiere_revision", "categoria", "sala_id",
]


@router.get("/clinicas/{clinic_id}/servicios")
async def listar_servicios(clinic_id: UUID, solo_activos: bool = True):
    db = get_supabase()
    query = db.table("servicios").select("*").eq("clinic_id", str(clinic_id))
    if solo_activos:
        query = query.eq("activo", True)
    result = query.order("orden").order("nombre").execute()
    return result.data


@router.post("/clinicas/{clinic_id}/servicios")
async def crear_servicio(clinic_id: UUID, data: dict):
    db = get_supabase()
    if not data.get("nombre"):
        raise HTTPException(status_code=400, detail="nombre es obligatorio")
    servicio = {
        "clinic_id": str(clinic_id),
        "nombre": data["nombre"],
        "duracion_min": data.get("duracion_min", 30),
        "color": data.get("color"),
        "descripcion": data.get("descripcion"),
        "activo": True,
        "orden": data.get("orden", 0),
    }
    result = db.table("servicios").insert(servicio).execute()
    return result.data[0]


@router.patch("/clinicas/{clinic_id}/servicios/{servicio_id}")
async def actualizar_servicio(clinic_id: UUID, servicio_id: UUID, data: dict):
    db = get_supabase()
    updates = {k: v for k, v in data.items() if k in _SERVICIOS_CAMPOS}
    # Permitir null explícito en campos opcionales
    for campo_nullable in ["sala_id", "descripcion", "categoria", "color", "precio"]:
        if campo_nullable in data:
            updates[campo_nullable] = data[campo_nullable]
    if not updates:
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")
    result = db.table("servicios").update(updates).eq("id", str(servicio_id)).eq("clinic_id", str(clinic_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return result.data[0]


@router.delete("/clinicas/{clinic_id}/servicios/{servicio_id}")
async def eliminar_servicio(clinic_id: UUID, servicio_id: UUID):
    db = get_supabase()
    db.table("servicios").update({"activo": False}).eq("id", str(servicio_id)).eq("clinic_id", str(clinic_id)).execute()
    return {"ok": True}


# ─── Servicio ↔ Profesional (many-to-many) ────────────────────────────────────

@router.get("/clinicas/{clinic_id}/servicios/{servicio_id}/profesionales")
async def listar_profesionales_servicio(clinic_id: UUID, servicio_id: UUID):
    db = get_supabase()
    result = db.table("servicio_profesional").select(
        "profesional_id, profesionales(id, nombre, color, especialidad)"
    ).eq("servicio_id", str(servicio_id)).execute()
    return [r["profesionales"] for r in (result.data or []) if r.get("profesionales")]


@router.post("/clinicas/{clinic_id}/servicios/{servicio_id}/profesionales")
async def asignar_profesional_servicio(clinic_id: UUID, servicio_id: UUID, data: dict):
    db = get_supabase()
    prof_id = data.get("profesional_id")
    if not prof_id:
        raise HTTPException(status_code=400, detail="profesional_id requerido")
    try:
        result = db.table("servicio_profesional").insert({
            "servicio_id": str(servicio_id),
            "profesional_id": str(prof_id),
        }).execute()
        return result.data[0]
    except Exception:
        raise HTTPException(status_code=409, detail="El profesional ya está asignado a este servicio")


@router.delete("/clinicas/{clinic_id}/servicios/{servicio_id}/profesionales/{prof_id}")
async def desasignar_profesional_servicio(clinic_id: UUID, servicio_id: UUID, prof_id: UUID):
    db = get_supabase()
    db.table("servicio_profesional").delete().eq("servicio_id", str(servicio_id)).eq("profesional_id", str(prof_id)).execute()
    return {"ok": True}


# ─── Salas / Recursos ────────────────────────────────────────────────────────

_SALAS_CAMPOS = ["nombre", "tipo", "capacidad", "activo", "orden"]


@router.get("/clinicas/{clinic_id}/salas")
async def listar_salas(clinic_id: UUID, solo_activas: bool = True):
    db = get_supabase()
    query = db.table("salas").select("*").eq("clinic_id", str(clinic_id))
    if solo_activas:
        query = query.eq("activo", True)
    result = query.order("orden").order("nombre").execute()
    return result.data


@router.post("/clinicas/{clinic_id}/salas")
async def crear_sala(clinic_id: UUID, data: dict):
    db = get_supabase()
    if not data.get("nombre"):
        raise HTTPException(status_code=400, detail="nombre es obligatorio")
    sala = {
        "clinic_id": str(clinic_id),
        "nombre": data["nombre"],
        "tipo": data.get("tipo", "sala"),
        "capacidad": data.get("capacidad", 1),
        "activo": True,
        "orden": data.get("orden", 0),
    }
    result = db.table("salas").insert(sala).execute()
    return result.data[0]


@router.patch("/clinicas/{clinic_id}/salas/{sala_id}")
async def actualizar_sala(clinic_id: UUID, sala_id: UUID, data: dict):
    db = get_supabase()
    updates = {k: v for k, v in data.items() if k in _SALAS_CAMPOS and v is not None}
    if "activo" in data:
        updates["activo"] = data["activo"]
    if not updates:
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")
    result = db.table("salas").update(updates).eq("id", str(sala_id)).eq("clinic_id", str(clinic_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    return result.data[0]


@router.delete("/clinicas/{clinic_id}/salas/{sala_id}")
async def eliminar_sala(clinic_id: UUID, sala_id: UUID):
    db = get_supabase()
    db.table("salas").update({"activo": False}).eq("id", str(sala_id)).eq("clinic_id", str(clinic_id)).execute()
    return {"ok": True}


# ─── Reglas de reserva ────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/reglas")
async def obtener_reglas(clinic_id: UUID):
    db = get_supabase()
    result = db.table("clinicas").select("reglas_reserva").eq("id", str(clinic_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")
    return result.data.get("reglas_reserva") or {}


@router.patch("/clinicas/{clinic_id}/reglas")
async def actualizar_reglas(clinic_id: UUID, data: dict):
    db = get_supabase()
    campos_validos = {
        "antelacion_min_horas", "max_dias_adelante", "intervalo_slots_min",
        "permite_mismo_dia", "permite_cancelacion_ia", "permite_reprogramacion_ia",
        "horas_limite_cancelar", "horas_limite_reprogramar", "max_citas_simultaneas",
    }
    reglas = {k: v for k, v in data.items() if k in campos_validos}
    if not reglas:
        raise HTTPException(status_code=400, detail="Sin campos válidos para actualizar")
    # Merge con las reglas existentes
    existing = db.table("clinicas").select("reglas_reserva").eq("id", str(clinic_id)).single().execute()
    reglas_actuales = (existing.data or {}).get("reglas_reserva") or {}
    reglas_actuales.update(reglas)
    result = db.table("clinicas").update({"reglas_reserva": reglas_actuales}).eq("id", str(clinic_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")
    return reglas_actuales


# ─── Bloques (ampliado) ───────────────────────────────────────────────────────


# ─── Disponibilidad por profesional ──────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/profesionales/{prof_id}/disponibilidad")
async def obtener_disponibilidad(clinic_id: UUID, prof_id: UUID):
    db = get_supabase()
    result = db.table("disponibilidad_profesional").select("*").eq("profesional_id", str(prof_id)).eq("clinic_id", str(clinic_id)).order("dia_semana").execute()
    return result.data


@router.put("/clinicas/{clinic_id}/profesionales/{prof_id}/disponibilidad")
async def guardar_disponibilidad(clinic_id: UUID, prof_id: UUID, data: dict):
    """Reemplaza toda la disponibilidad de un profesional. data.horarios = [{dia_semana, hora_inicio, hora_fin, activo}]"""
    db = get_supabase()
    horarios = data.get("horarios", [])
    # Borrar existentes
    db.table("disponibilidad_profesional").delete().eq("profesional_id", str(prof_id)).eq("clinic_id", str(clinic_id)).execute()
    if not horarios:
        return []
    filas = []
    for h in horarios:
        if h.get("dia_semana") is None or not h.get("hora_inicio") or not h.get("hora_fin"):
            continue
        filas.append({
            "clinic_id": str(clinic_id),
            "profesional_id": str(prof_id),
            "dia_semana": int(h["dia_semana"]),
            "hora_inicio": h["hora_inicio"],
            "hora_fin": h["hora_fin"],
            "activo": h.get("activo", True),
        })
    if not filas:
        return []
    result = db.table("disponibilidad_profesional").insert(filas).execute()
    return result.data


@router.get("/clinicas/{clinic_id}/leads/{lead_id}")
async def obtener_lead(clinic_id: UUID, lead_id: UUID):
    db = get_supabase()
    result = db.table("pacientes").select("*").eq("clinic_id", str(clinic_id)).eq("id", str(lead_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return result.data


# ─── Jobs ────────────────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/jobs")
async def listar_jobs(clinic_id: UUID, estado: str | None = None):
    db = get_supabase()
    query = db.table("jobs").select("*").eq("clinic_id", str(clinic_id))
    if estado:
        query = query.eq("estado", estado)
    result = query.order("fecha_programada", desc=True).execute()
    return result.data


# ─── Métricas rápidas ────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/metricas")
async def metricas_clinica(clinic_id: UUID):
    db = get_supabase()
    from datetime import date, timedelta
    hoy = date.today()
    ayer = hoy - timedelta(days=1)
    hoy_str = hoy.isoformat()
    ayer_str = ayer.isoformat()

    def count_hoy(tabla: str, campo_fecha: str, filtros: dict | None = None):
        q = db.table(tabla).select("id", count="exact").eq("clinic_id", str(clinic_id)) \
            .gte(campo_fecha, f"{hoy_str}T00:00:00Z").lte(campo_fecha, f"{hoy_str}T23:59:59Z")
        for k, v in (filtros or {}).items():
            q = q.eq(k, v)
        return q.execute().count or 0

    def count_ayer(tabla: str, campo_fecha: str, filtros: dict | None = None):
        q = db.table(tabla).select("id", count="exact").eq("clinic_id", str(clinic_id)) \
            .gte(campo_fecha, f"{ayer_str}T00:00:00Z").lte(campo_fecha, f"{ayer_str}T23:59:59Z")
        for k, v in (filtros or {}).items():
            q = q.eq(k, v)
        return q.execute().count or 0

    leads_hoy = count_hoy("pacientes", "created_at")
    leads_ayer = count_ayer("pacientes", "created_at")
    citas_hoy = count_hoy("citas", "fecha_inicio")
    citas_ayer = count_ayer("citas", "fecha_inicio")
    convs_hoy = count_hoy("conversaciones", "created_at")
    convs_ayer = count_ayer("conversaciones", "created_at")

    pendientes_humano = db.table("conversaciones").select("id", count="exact") \
        .eq("clinic_id", str(clinic_id)).eq("estado", "esperando_humano").execute().count or 0

    def pct(hoy_v: int, ayer_v: int) -> int | None:
        if ayer_v == 0:
            return None
        return round((hoy_v - ayer_v) / ayer_v * 100)

    return {
        "leads_hoy": leads_hoy,
        "leads_ayer": leads_ayer,
        "leads_pct": pct(leads_hoy, leads_ayer),
        "citas_hoy": citas_hoy,
        "citas_ayer": citas_ayer,
        "citas_pct": pct(citas_hoy, citas_ayer),
        "convs_hoy": convs_hoy,
        "convs_ayer": convs_ayer,
        "convs_pct": pct(convs_hoy, convs_ayer),
        "conversaciones_esperando_humano": pendientes_humano,
    }


# ─── Base de conocimiento ─────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/conocimiento")
async def listar_conocimiento(clinic_id: UUID, solo_activos: bool = False):
    db = get_supabase()
    q = db.table("conocimientos").select("*").eq("clinic_id", str(clinic_id))
    if solo_activos:
        q = q.eq("activo", True)
    result = q.order("orden").order("created_at").execute()
    return result.data


@router.post("/clinicas/{clinic_id}/conocimiento")
async def crear_conocimiento(clinic_id: UUID, data: dict):
    db = get_supabase()
    row = {
        "clinic_id": str(clinic_id),
        "titulo": data.get("titulo", "").strip(),
        "contenido": data.get("contenido", "").strip(),
        "tipo": data.get("tipo", "faq"),
        "activo": data.get("activo", True),
        "orden": data.get("orden", 0),
    }
    if not row["titulo"] or not row["contenido"]:
        raise HTTPException(status_code=400, detail="titulo y contenido son obligatorios")
    result = db.table("conocimientos").insert(row).execute()
    return result.data[0]


@router.patch("/clinicas/{clinic_id}/conocimiento/{entrada_id}")
async def actualizar_conocimiento(clinic_id: UUID, entrada_id: UUID, data: dict):
    db = get_supabase()
    allowed = {"titulo", "contenido", "tipo", "activo", "orden"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="Sin campos válidos para actualizar")
    result = db.table("conocimientos").update(updates) \
        .eq("id", str(entrada_id)).eq("clinic_id", str(clinic_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    return result.data[0]


@router.delete("/clinicas/{clinic_id}/conocimiento/{entrada_id}", status_code=204)
async def eliminar_conocimiento(clinic_id: UUID, entrada_id: UUID):
    db = get_supabase()
    db.table("conocimientos").delete() \
        .eq("id", str(entrada_id)).eq("clinic_id", str(clinic_id)).execute()
    return


# ─── Lista de espera ──────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/lista-espera")
async def listar_espera(clinic_id: UUID, estado: str | None = None):
    db = get_supabase()
    q = db.table("lista_espera").select(
        "*, pacientes(nombre, telefono, email, canal_origen)"
    ).eq("clinic_id", str(clinic_id))
    if estado:
        q = q.eq("estado", estado)
    result = q.order("created_at").execute()
    return result.data


@router.post("/clinicas/{clinic_id}/lista-espera")
async def crear_entrada_espera(clinic_id: UUID, data: dict):
    db = get_supabase()
    row = {
        "clinic_id": str(clinic_id),
        "paciente_id": data.get("paciente_id"),
        "servicio_nombre": data.get("servicio_nombre", "").strip(),
        "profesional_id": data.get("profesional_id"),
        "notas": data.get("notas", "").strip() or None,
        "estado": "esperando",
    }
    result = db.table("lista_espera").insert(row).execute()
    return result.data[0]


@router.patch("/clinicas/{clinic_id}/lista-espera/{entrada_id}")
async def actualizar_entrada_espera(clinic_id: UUID, entrada_id: UUID, data: dict):
    db = get_supabase()
    allowed = {"estado", "notas", "notificado_at"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="Sin campos válidos")
    result = db.table("lista_espera").update(updates) \
        .eq("id", str(entrada_id)).eq("clinic_id", str(clinic_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    return result.data[0]


@router.delete("/clinicas/{clinic_id}/lista-espera/{entrada_id}", status_code=204)
async def eliminar_entrada_espera(clinic_id: UUID, entrada_id: UUID):
    db = get_supabase()
    db.table("lista_espera").delete() \
        .eq("id", str(entrada_id)).eq("clinic_id", str(clinic_id)).execute()
    return


# ─── Recuperación de leads ────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/recuperacion")
async def leads_recuperacion(clinic_id: UUID):
    """Leads fríos: perdidos o sin cita y sin actividad reciente (>3 días)."""
    from datetime import date, timedelta
    from scoring import enriquecer_leads

    db = get_supabase()
    hace_3_dias = (date.today() - timedelta(days=3)).isoformat()

    # Leads perdidos
    perdidos = db.table("pacientes").select("*") \
        .eq("clinic_id", str(clinic_id)) \
        .eq("estado_lead", "perdido") \
        .execute().data

    # Leads sin cita (nuevo/interesado/contactado) sin actividad >3 días y con teléfono
    sin_cita = db.table("pacientes").select("*") \
        .eq("clinic_id", str(clinic_id)) \
        .in_("estado_lead", ["nuevo", "interesado", "contactado"]) \
        .neq("telefono", None) \
        .lte("created_at", f"{hace_3_dias}T23:59:59Z") \
        .execute().data

    todos = {p["id"]: p for p in perdidos}
    for p in sin_cita:
        todos.setdefault(p["id"], p)

    result = list(todos.values())
    result.sort(key=lambda p: p.get("created_at", ""), reverse=True)
    return enriquecer_leads(result)


@router.post("/clinicas/{clinic_id}/leads/{lead_id}/seguimiento")
async def disparar_seguimiento(clinic_id: UUID, lead_id: UUID):
    """Crea job inmediato de seguimiento WhatsApp para un lead."""
    from datetime import datetime, timezone as tz
    db = get_supabase()
    paciente = db.table("pacientes").select("id, clinic_id, telefono") \
        .eq("id", str(lead_id)).eq("clinic_id", str(clinic_id)).single().execute()
    if not paciente.data:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    if not paciente.data.get("telefono"):
        raise HTTPException(status_code=400, detail="El lead no tiene teléfono")

    ahora = datetime.now(tz.utc)
    idem_key = f"seguimiento_recovery_{str(lead_id)}_{ahora.date()}"
    result = db.table("jobs").upsert({
        "clinic_id": str(clinic_id),
        "paciente_id": str(lead_id),
        "tipo": "seguimiento_lead",
        "fecha_programada": ahora.isoformat(),
        "estado": "pendiente",
        "idempotency_key": idem_key,
        "payload": {"motivo": "recovery_manual"},
    }, on_conflict="idempotency_key").execute()
    return {"ok": True, "job_id": result.data[0]["id"]}


# ── Retell agent management ───────────────────────────────────────────────────

@router.post("/clinicas/{clinic_id}/retell/agent")
async def provision_retell_agent(clinic_id: UUID):
    """Creates or returns the Retell agent for a clinic. Internal use only."""
    db = get_supabase()
    row = db.table("clinicas").select("nombre, retell_agent_id").eq("id", str(clinic_id)).single().execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")
    clinica = row.data
    try:
        from retell_manager import provision_clinic_agent
        agent_id = await provision_clinic_agent(str(clinic_id), clinica["nombre"])
        return {"agent_id": agent_id, "clinic_id": str(clinic_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error Retell: {e}")


@router.get("/clinicas/{clinic_id}/retell/agent")
async def get_retell_agent_info(clinic_id: UUID):
    """Returns Retell agent info for a clinic."""
    db = get_supabase()
    row = db.table("clinicas").select("retell_agent_id, nombre").eq("id", str(clinic_id)).single().execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")
    agent_id = row.data.get("retell_agent_id")
    if not agent_id:
        return {"configured": False, "agent_id": None}
    try:
        from retell_manager import get_agent
        agent = await get_agent(agent_id)
        return {"configured": True, "agent_id": agent_id, "agent": agent}
    except Exception as e:
        return {"configured": True, "agent_id": agent_id, "error": str(e)}


@router.delete("/clinicas/{clinic_id}/retell/agent")
async def delete_retell_agent(clinic_id: UUID):
    """Deletes the Retell agent for a clinic."""
    db = get_supabase()
    row = db.table("clinicas").select("retell_agent_id").eq("id", str(clinic_id)).single().execute()
    agent_id = (row.data or {}).get("retell_agent_id")
    if not agent_id:
        return {"ok": True, "message": "No agent configured"}
    from retell_manager import delete_agent
    await delete_agent(agent_id)
    db.table("clinicas").update({"retell_agent_id": None}).eq("id", str(clinic_id)).execute()
    return {"ok": True}


# Note: /clinicas/{clinic_id}/canales GET + 360dialog PATCH/DELETE are in routers/canales.py
