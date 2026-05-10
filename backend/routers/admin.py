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
    db = get_supabase()
    query = db.table("pacientes").select("*").eq("clinic_id", str(clinic_id))
    if estado:
        query = query.eq("estado_lead", estado)
    if canal:
        query = query.eq("canal_origen", canal)
    result = query.order("created_at", desc=True).execute()
    return result.data


# ─── Conversaciones ──────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/conversaciones")
async def listar_conversaciones(clinic_id: UUID, estado: str | None = None):
    db = get_supabase()
    query = db.table("conversaciones") \
        .select("id, paciente_id, canal, estado, created_at, updated_at") \
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
    "profesional", "notas_internas", "color", "duracion_min",
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
        "activo": True,
        "orden": data.get("orden", 0),
    }
    result = db.table("profesionales").insert(prof).execute()
    return result.data[0]


@router.patch("/clinicas/{clinic_id}/profesionales/{prof_id}")
async def actualizar_profesional(clinic_id: UUID, prof_id: UUID, data: dict):
    db = get_supabase()
    campos = {k: v for k, v in data.items() if k in ["nombre", "color", "especialidad", "activo", "orden"] and v is not None}
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
        "profesional": data.get("profesional"),
        "tipo": data.get("tipo", "bloqueo"),
    }
    result = db.table("bloques_agenda").insert(bloque).execute()
    return result.data[0]


@router.delete("/clinicas/{clinic_id}/bloques/{bloque_id}")
async def eliminar_bloque(clinic_id: UUID, bloque_id: UUID):
    db = get_supabase()
    db.table("bloques_agenda").delete().eq("id", str(bloque_id)).eq("clinic_id", str(clinic_id)).execute()
    return {"ok": True}


# ─── Servicios ────────────────────────────────────────────────────────────────

_SERVICIOS_CAMPOS = ["nombre", "duracion_min", "color", "descripcion", "activo", "orden"]


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
    updates = {k: v for k, v in data.items() if k in _SERVICIOS_CAMPOS and v is not None}
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
    from datetime import date
    hoy = date.today().isoformat()

    leads_hoy = db.table("pacientes") \
        .select("id", count="exact") \
        .eq("clinic_id", str(clinic_id)) \
        .gte("created_at", f"{hoy}T00:00:00Z") \
        .execute()

    citas_hoy = db.table("citas") \
        .select("id", count="exact") \
        .eq("clinic_id", str(clinic_id)) \
        .gte("fecha_inicio", f"{hoy}T00:00:00Z") \
        .lte("fecha_inicio", f"{hoy}T23:59:59Z") \
        .execute()

    pendientes_humano = db.table("conversaciones") \
        .select("id", count="exact") \
        .eq("clinic_id", str(clinic_id)) \
        .eq("estado", "esperando_humano") \
        .execute()

    return {
        "leads_hoy": leads_hoy.count or 0,
        "citas_hoy": citas_hoy.count or 0,
        "conversaciones_esperando_humano": pendientes_humano.count or 0,
    }
