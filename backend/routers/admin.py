import logging
from datetime import date, datetime, time, timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database.client import get_supabase
from models.clinica import ClinicaCreate, ClinicaUpdate
from security import require_admin_key

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_admin_key)])
_DEFAULT_LIST_LIMIT = 200
_MAX_LIST_LIMIT = 500
_APP_TZ = ZoneInfo("Europe/Madrid")


def _paginate(query, limit: int | None, offset: int | None, default_limit: int = _DEFAULT_LIST_LIMIT):
    lim = default_limit if limit is None else max(1, min(int(limit), _MAX_LIST_LIMIT))
    off = 0 if offset is None else max(0, int(offset))
    return query.range(off, off + lim - 1)


def _utc_bounds_for_local_day(fecha_iso: str) -> tuple[str, str]:
    """
    Convierte una fecha local (YYYY-MM-DD, Europe/Madrid) a [inicio_utc, fin_utc_exclusivo).
    Usar gte(inicio) + lt(fin) evita errores en cambios de hora y microsegundos.
    """
    try:
        local_day = date.fromisoformat(fecha_iso)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Usa YYYY-MM-DD.") from exc

    local_start = datetime.combine(local_day, time.min, tzinfo=_APP_TZ)
    local_end = local_start + timedelta(days=1)
    start_utc = local_start.astimezone(timezone.utc).isoformat()
    end_utc = local_end.astimezone(timezone.utc).isoformat()
    return start_utc, end_utc


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
async def listar_leads(
    clinic_id: UUID,
    estado: str | None = None,
    canal: str | None = None,
    limit: int | None = None,
    offset: int | None = None,
):
    from scoring import enriquecer_leads
    db = get_supabase()
    query = db.table("pacientes").select("*").eq("clinic_id", str(clinic_id))
    if estado:
        query = query.eq("estado_lead", estado)
    if canal:
        query = query.eq("canal_origen", canal)
    result = _paginate(query.order("created_at", desc=True), limit, offset).execute()
    return enriquecer_leads(result.data)


# ─── Conversaciones ──────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/conversaciones")
async def listar_conversaciones(
    clinic_id: UUID,
    estado: str | None = None,
    fecha: str | None = None,
    include_mensajes: bool = False,
    limit: int | None = None,
    offset: int | None = None,
):
    db = get_supabase()
    select_fields = "id, paciente_id, canal, estado, created_at, updated_at, pacientes(nombre)"
    if include_mensajes:
        select_fields = "id, paciente_id, canal, estado, mensajes, created_at, updated_at, pacientes(nombre)"
    query = db.table("conversaciones") \
        .select(select_fields) \
        .eq("clinic_id", str(clinic_id))
    if estado:
        query = query.eq("estado", estado)
    if fecha:
        start_utc, end_utc = _utc_bounds_for_local_day(fecha)
        query = query.gte("updated_at", start_utc).lt("updated_at", end_utc)
    result = _paginate(query.order("updated_at", desc=True), limit, offset).execute()
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
    """Añade respuesta manual del humano y la envía al paciente por su canal."""
    db = get_supabase()

    conv = db.table("conversaciones") \
        .select("mensajes, canal, paciente_id") \
        .eq("id", str(conv_id)) \
        .eq("clinic_id", str(clinic_id)) \
        .single() \
        .execute()

    conv_data = conv.data or {}
    mensajes = conv_data.get("mensajes") or []
    canal = conv_data.get("canal", "")
    paciente_id = conv_data.get("paciente_id")
    mensaje = str(body.get("mensaje", "")).strip()
    if not mensaje or len(mensaje) > 4000:
        raise HTTPException(status_code=400, detail="Mensaje vacío o demasiado largo")

    # Entregar primero; solo registrar y reabrir cuando el proveedor confirma.
    if canal == "voz":
        raise HTTPException(status_code=409, detail="Una llamada finalizada no admite respuesta directa")
    if canal == "whatsapp":
        paciente = db.table("pacientes").select("telefono").eq("id", paciente_id).eq("clinic_id", str(clinic_id)).single().execute()
        telefono = (paciente.data or {}).get("telefono")
        if not telefono:
            raise HTTPException(status_code=409, detail="El paciente no tiene teléfono de WhatsApp")

        clinica = db.table("clinicas").select(
            "meta_phone_number_id, meta_access_token"
        ).eq("id", str(clinic_id)).single().execute().data or {}
        token = None
        if clinica.get("meta_access_token"):
            try:
                from cryptography.fernet import Fernet
                from config import settings
                token = Fernet(settings.fernet_key.encode()).decrypt(
                    clinica["meta_access_token"].encode()
                ).decode()
            except Exception as exc:
                logger.error("No se pudo descifrar el token Meta de %s: %s", clinic_id, exc)
                raise HTTPException(status_code=502, detail="Credencial de WhatsApp inválida") from exc

        import whatsapp as wa
        sent = await wa.send_text(
            telefono,
            mensaje,
            clinic_whatsapp_number=clinica.get("meta_phone_number_id"),
            access_token=token,
        )
        if not sent:
            raise HTTPException(status_code=502, detail="WhatsApp no confirmó la entrega del mensaje")

    mensajes.append({
        "role": "assistant",
        "content": mensaje,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "from_human": True,
    })

    db.table("conversaciones").update({
        "mensajes": mensajes,
        "estado": "activa",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(conv_id)).eq("clinic_id", str(clinic_id)).execute()

    result = db.table("conversaciones") \
        .select("*") \
        .eq("id", str(conv_id)) \
        .single() \
        .execute()
    return result.data


# ─── Citas ───────────────────────────────────────────────────────────────────

_CITAS_CAMPOS = [
    "tipo_servicio", "fecha_inicio", "fecha_fin", "estado",
    "profesional", "profesional_id", "sala_id", "conversacion_id",
    "notas_internas", "color", "duracion_min",
    "paciente_nombre", "paciente_telefono", "origen",
]

_ORIGENES_VALIDOS = {"manual", "ia_llamada", "ia_whatsapp", "ia_chat", "google_calendar"}
_ESTADOS_VALIDOS = {"pendiente", "confirmada", "reprogramada", "completada", "cancelada", "no_asistio"}


def _exists_in_clinic(db, table: str, entity_id: str, clinic_id: str) -> bool:
    result = db.table(table).select("id").eq("id", entity_id).eq("clinic_id", clinic_id).limit(1).execute()
    return bool(result.data)


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
    limit: int | None = None,
    offset: int | None = None,
):
    db = get_supabase()
    query = db.table("citas").select(
        "id, clinic_id, paciente_id, google_event_id, tipo_servicio, fecha_inicio, fecha_fin, "
        "estado, profesional, notas_internas, color, duracion_min, origen, "
        "paciente_nombre, paciente_telefono, created_at, updated_at, "
        "pacientes(nombre, telefono)"
    ).eq("clinic_id", str(clinic_id))
    if fecha:
        start_utc, end_utc = _utc_bounds_for_local_day(fecha)
        query = query.gte("fecha_inicio", start_utc).lt("fecha_inicio", end_utc)
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
    result = _paginate(query.order("fecha_inicio"), limit, offset).execute()
    return result.data


@router.post("/clinicas/{clinic_id}/citas")
async def crear_cita(clinic_id: UUID, data: dict):
    from zoneinfo import ZoneInfo
    from google_calendar import client as gcal
    TZ = ZoneInfo("Europe/Madrid")

    db = get_supabase()
    if not data.get("fecha_inicio"):
        raise HTTPException(status_code=400, detail="fecha_inicio es obligatorio")

    fecha_inicio_str = data["fecha_inicio"]
    fecha_fin_str = data.get("fecha_fin")
    profesional = data.get("profesional")

    if not fecha_fin_str and data.get("duracion_min"):
        fi = datetime.fromisoformat(fecha_inicio_str.replace("Z", "+00:00"))
        fecha_fin_str = (fi + timedelta(minutes=int(data["duracion_min"]))).isoformat()
        data["fecha_fin"] = fecha_fin_str

    clinic_id_str = str(clinic_id)
    if _check_conflicts(db, clinic_id_str, fecha_inicio_str, fecha_fin_str or "", profesional):
        raise HTTPException(status_code=409, detail=f"El profesional '{profesional}' ya tiene una cita en ese horario")

    if data.get("paciente_id") and not _exists_in_clinic(db, "pacientes", str(data["paciente_id"]), clinic_id_str):
        raise HTTPException(status_code=404, detail="Paciente no encontrado en la clínica")
    if data.get("profesional_id") and not _exists_in_clinic(db, "profesionales", str(data["profesional_id"]), clinic_id_str):
        raise HTTPException(status_code=404, detail="Profesional no encontrado en la clínica")
    if data.get("sala_id") and not _exists_in_clinic(db, "salas", str(data["sala_id"]), clinic_id_str):
        raise HTTPException(status_code=404, detail="Sala no encontrada en la clínica")

    cita = {"clinic_id": clinic_id_str, "estado": data.get("estado", "confirmada")}
    for k in _CITAS_CAMPOS:
        if data.get(k) is not None:
            cita[k] = data[k]
    result = db.table("citas").insert(cita).execute()
    nueva_cita = result.data[0]

    # Sincronizar con Google Calendar
    try:
        clinica = db.table("clinicas").select("google_tokens_enc, nombre").eq("id", str(clinic_id)).single().execute()
        if clinica.data and clinica.data.get("google_tokens_enc"):
            fi = datetime.fromisoformat(fecha_inicio_str.replace("Z", "+00:00"))
            ff = datetime.fromisoformat(fecha_fin_str.replace("Z", "+00:00")) if fecha_fin_str else fi + timedelta(hours=1)
            titulo = data.get("tipo_servicio") or "Cita"
            if data.get("paciente_nombre"):
                titulo += f" — {data['paciente_nombre']}"
            event_id = gcal.crear_evento(
                clinic_id=clinic_id,
                titulo=titulo,
                fecha_inicio=fi,
                fecha_fin=ff,
                descripcion=data.get("notas_internas") or "Creada desde panel Atiende360",
            )
            db.table("citas").update({"google_event_id": event_id}).eq("id", nueva_cita["id"]).execute()
            nueva_cita["google_event_id"] = event_id
    except Exception as exc:
        logger.warning("GCal sync (crear) fallida para cita %s: %s", nueva_cita["id"], exc)

    return nueva_cita


@router.patch("/clinicas/{clinic_id}/citas/{cita_id}")
async def actualizar_cita(clinic_id: UUID, cita_id: UUID, data: dict):
    from google_calendar import client as gcal

    db = get_supabase()
    clinic_id_str = str(clinic_id)
    updates = {k: v for k, v in data.items() if k in _CITAS_CAMPOS and v is not None}
    if "notas_internas" in data:
        updates["notas_internas"] = data["notas_internas"]
    if not updates:
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")

    existing_res = db.table("citas").select("fecha_inicio, fecha_fin, profesional, google_event_id").eq("id", str(cita_id)).eq("clinic_id", clinic_id_str).single().execute()
    existing = existing_res.data or {}
    if not existing:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    if "paciente_id" in updates and updates["paciente_id"] and not _exists_in_clinic(db, "pacientes", str(updates["paciente_id"]), clinic_id_str):
        raise HTTPException(status_code=404, detail="Paciente no encontrado en la clínica")
    if "profesional_id" in updates and updates["profesional_id"] and not _exists_in_clinic(db, "profesionales", str(updates["profesional_id"]), clinic_id_str):
        raise HTTPException(status_code=404, detail="Profesional no encontrado en la clínica")
    if "sala_id" in updates and updates["sala_id"] and not _exists_in_clinic(db, "salas", str(updates["sala_id"]), clinic_id_str):
        raise HTTPException(status_code=404, detail="Sala no encontrada en la clínica")

    if "fecha_inicio" in updates or "profesional" in updates:
        fi = updates.get("fecha_inicio", existing.get("fecha_inicio", ""))
        ff = updates.get("fecha_fin", existing.get("fecha_fin", ""))
        prof = updates.get("profesional", existing.get("profesional"))
        if _check_conflicts(db, clinic_id_str, fi, ff or "", prof, exclude_id=str(cita_id)):
            raise HTTPException(status_code=409, detail=f"El profesional '{prof}' ya tiene una cita en ese horario")

    result = db.table("citas").update(updates).eq("id", str(cita_id)).eq("clinic_id", clinic_id_str).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    # Sincronizar fecha con Google Calendar si cambió
    event_id = existing.get("google_event_id")
    if event_id and ("fecha_inicio" in updates or "fecha_fin" in updates):
        try:
            fi_str = updates.get("fecha_inicio", existing.get("fecha_inicio", ""))
            ff_str = updates.get("fecha_fin", existing.get("fecha_fin", ""))
            fi = datetime.fromisoformat(fi_str.replace("Z", "+00:00"))
            ff = datetime.fromisoformat(ff_str.replace("Z", "+00:00")) if ff_str else fi + timedelta(hours=1)
            gcal.mover_evento(clinic_id=clinic_id, event_id=event_id, nueva_fecha_inicio=fi, nueva_fecha_fin=ff)
        except Exception as exc:
            logger.warning("GCal sync (mover) fallida para cita %s: %s", cita_id, exc)

    return result.data[0]


@router.delete("/clinicas/{clinic_id}/citas/{cita_id}")
async def eliminar_cita(clinic_id: UUID, cita_id: UUID):
    from google_calendar import client as gcal

    db = get_supabase()
    existing = db.table("citas").select("google_event_id").eq("id", str(cita_id)).eq("clinic_id", str(clinic_id)).single().execute()
    event_id = (existing.data or {}).get("google_event_id")

    db.table("citas").delete().eq("id", str(cita_id)).eq("clinic_id", str(clinic_id)).execute()

    if event_id:
        try:
            gcal.cancelar_evento(clinic_id=clinic_id, event_id=event_id)
        except Exception as exc:
            logger.warning("GCal sync (cancelar) fallida para cita %s: %s", cita_id, exc)

    return {"ok": True}


def _do_sync_gcal(clinic_id_str: str) -> dict:
    """Importa eventos GCal→DB. Reutilizable por el endpoint HTTP y el scheduler."""
    from zoneinfo import ZoneInfo
    from google_calendar import client as gcal

    TZ = ZoneInfo("Europe/Madrid")
    db = get_supabase()

    ahora = datetime.now(TZ)
    fecha_inicio = ahora - timedelta(days=7)
    fecha_fin = ahora + timedelta(days=60)

    eventos = gcal.listar_eventos_rango(UUID(clinic_id_str), fecha_inicio, fecha_fin)

    importados = 0
    actualizados = 0

    for ev in eventos:
        event_id = ev.get("id")
        if not event_id:
            continue
        start = ev.get("start", {})
        if "date" in start and "dateTime" not in start:
            continue
        fi_str = start.get("dateTime", "")
        ff_str = ev.get("end", {}).get("dateTime", "")
        if not fi_str:
            continue

        fi = datetime.fromisoformat(fi_str.replace("Z", "+00:00"))
        ff = datetime.fromisoformat(ff_str.replace("Z", "+00:00")) if ff_str else fi + timedelta(hours=1)
        titulo = ev.get("summary", "Evento de Google Calendar")

        existente = db.table("citas").select("id, fecha_inicio").eq("clinic_id", clinic_id_str).eq("google_event_id", event_id).execute()
        if existente.data:
            if existente.data[0]["fecha_inicio"] != fi.isoformat():
                db.table("citas").update({
                    "fecha_inicio": fi.isoformat(),
                    "fecha_fin": ff.isoformat(),
                    "tipo_servicio": titulo,
                }).eq("id", existente.data[0]["id"]).execute()
                actualizados += 1
        else:
            db.table("citas").insert({
                "clinic_id": clinic_id_str,
                "tipo_servicio": titulo,
                "fecha_inicio": fi.isoformat(),
                "fecha_fin": ff.isoformat(),
                "estado": "confirmada",
                "origen": "google_calendar",
                "google_event_id": event_id,
                "notas_internas": ev.get("description", "") or "",
            }).execute()
            importados += 1

    return {"importados": importados, "actualizados": actualizados, "total_eventos": len(eventos)}


@router.post("/clinicas/{clinic_id}/citas/sync-gcal")
async def sync_desde_gcal(clinic_id: UUID):
    """Importa eventos de Google Calendar como citas en Atiende360 (últimos 7 días + próximos 60)."""
    db = get_supabase()
    clinica = db.table("clinicas").select("google_tokens_enc").eq("id", str(clinic_id)).single().execute()
    if not (clinica.data and clinica.data.get("google_tokens_enc")):
        raise HTTPException(status_code=400, detail="Google Calendar no conectado")

    try:
        result = _do_sync_gcal(str(clinic_id))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error leyendo Google Calendar: {exc}")

    return {"ok": True, **result}


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
    clinic_id_str = str(clinic_id)

    prof_id = str(data["profesional_id"]) if data.get("profesional_id") else None
    if prof_id and not _exists_in_clinic(db, "profesionales", prof_id, clinic_id_str):
        raise HTTPException(status_code=404, detail="Profesional no encontrado en la clínica")

    sala_id = str(data["sala_id"]) if data.get("sala_id") else None
    if sala_id and not _exists_in_clinic(db, "salas", sala_id, clinic_id_str):
        raise HTTPException(status_code=404, detail="Sala no encontrada en la clínica")

    bloque = {
        "clinic_id": clinic_id_str,
        "titulo": data["titulo"],
        "fecha_inicio": data["fecha_inicio"],
        "fecha_fin": data["fecha_fin"],
        "tipo": data.get("tipo", "bloqueo"),
        "notas": data.get("notas"),
    }
    if prof_id:
        bloque["profesional_id"] = prof_id
    if sala_id:
        bloque["sala_id"] = sala_id
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
    clinic_id_str = str(clinic_id)
    updates = {k: v for k, v in data.items() if k in _SERVICIOS_CAMPOS}
    # Permitir null explícito en campos opcionales
    for campo_nullable in ["sala_id", "descripcion", "categoria", "color", "precio"]:
        if campo_nullable in data:
            updates[campo_nullable] = data[campo_nullable]
    if "sala_id" in updates and updates["sala_id"]:
        sala_id = str(updates["sala_id"])
        if not _exists_in_clinic(db, "salas", sala_id, clinic_id_str):
            raise HTTPException(status_code=404, detail="Sala no encontrada en la clínica")
        updates["sala_id"] = sala_id
    if not updates:
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")
    result = db.table("servicios").update(updates).eq("id", str(servicio_id)).eq("clinic_id", clinic_id_str).execute()
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
    clinic_id_str = str(clinic_id)
    servicio_id_str = str(servicio_id)
    if not _exists_in_clinic(db, "servicios", servicio_id_str, clinic_id_str):
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    links = db.table("servicio_profesional").select("profesional_id").eq("servicio_id", servicio_id_str).execute()
    prof_ids = [r.get("profesional_id") for r in (links.data or []) if r.get("profesional_id")]
    if not prof_ids:
        return []

    profs = db.table("profesionales").select("id, nombre, color, especialidad").in_("id", prof_ids).eq("clinic_id", clinic_id_str).execute()
    by_id = {p["id"]: p for p in (profs.data or [])}
    return [by_id[pid] for pid in prof_ids if pid in by_id]


@router.post("/clinicas/{clinic_id}/servicios/{servicio_id}/profesionales")
async def asignar_profesional_servicio(clinic_id: UUID, servicio_id: UUID, data: dict):
    db = get_supabase()
    clinic_id_str = str(clinic_id)
    servicio_id_str = str(servicio_id)
    prof_id = data.get("profesional_id")
    if not prof_id:
        raise HTTPException(status_code=400, detail="profesional_id requerido")
    prof_id_str = str(prof_id)

    if not _exists_in_clinic(db, "servicios", servicio_id_str, clinic_id_str):
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if not _exists_in_clinic(db, "profesionales", prof_id_str, clinic_id_str):
        raise HTTPException(status_code=404, detail="Profesional no encontrado")

    try:
        result = db.table("servicio_profesional").insert({
            "servicio_id": servicio_id_str,
            "profesional_id": prof_id_str,
        }).execute()
        return result.data[0]
    except Exception:
        raise HTTPException(status_code=409, detail="El profesional ya está asignado a este servicio")


@router.delete("/clinicas/{clinic_id}/servicios/{servicio_id}/profesionales/{prof_id}")
async def desasignar_profesional_servicio(clinic_id: UUID, servicio_id: UUID, prof_id: UUID):
    db = get_supabase()
    clinic_id_str = str(clinic_id)
    servicio_id_str = str(servicio_id)
    prof_id_str = str(prof_id)

    if not _exists_in_clinic(db, "servicios", servicio_id_str, clinic_id_str):
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if not _exists_in_clinic(db, "profesionales", prof_id_str, clinic_id_str):
        raise HTTPException(status_code=404, detail="Profesional no encontrado")

    db.table("servicio_profesional").delete().eq("servicio_id", servicio_id_str).eq("profesional_id", prof_id_str).execute()
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
    clinic_id_str = str(clinic_id)
    prof_id_str = str(prof_id)
    if not _exists_in_clinic(db, "profesionales", prof_id_str, clinic_id_str):
        raise HTTPException(status_code=404, detail="Profesional no encontrado")
    result = db.table("disponibilidad_profesional").select("*").eq("profesional_id", prof_id_str).eq("clinic_id", clinic_id_str).order("dia_semana").execute()
    return result.data


@router.put("/clinicas/{clinic_id}/profesionales/{prof_id}/disponibilidad")
async def guardar_disponibilidad(clinic_id: UUID, prof_id: UUID, data: dict):
    """Reemplaza toda la disponibilidad de un profesional. data.horarios = [{dia_semana, hora_inicio, hora_fin, activo}]"""
    db = get_supabase()
    clinic_id_str = str(clinic_id)
    prof_id_str = str(prof_id)
    if not _exists_in_clinic(db, "profesionales", prof_id_str, clinic_id_str):
        raise HTTPException(status_code=404, detail="Profesional no encontrado")
    horarios = data.get("horarios", [])
    # Borrar existentes
    db.table("disponibilidad_profesional").delete().eq("profesional_id", prof_id_str).eq("clinic_id", clinic_id_str).execute()
    if not horarios:
        return []
    filas = []
    for h in horarios:
        if h.get("dia_semana") is None or not h.get("hora_inicio") or not h.get("hora_fin"):
            continue
        filas.append({
            "clinic_id": clinic_id_str,
            "profesional_id": prof_id_str,
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
    hoy = datetime.now(_APP_TZ).date()
    ayer = hoy - timedelta(days=1)
    hoy_start_utc, hoy_end_utc = _utc_bounds_for_local_day(hoy.isoformat())
    ayer_start_utc, ayer_end_utc = _utc_bounds_for_local_day(ayer.isoformat())

    def count_hoy(tabla: str, campo_fecha: str, filtros: dict | None = None):
        q = db.table(tabla).select("id", count="exact").eq("clinic_id", str(clinic_id)) \
            .gte(campo_fecha, hoy_start_utc).lt(campo_fecha, hoy_end_utc)
        for k, v in (filtros or {}).items():
            q = q.eq(k, v)
        return q.execute().count or 0

    def count_ayer(tabla: str, campo_fecha: str, filtros: dict | None = None):
        q = db.table(tabla).select("id", count="exact").eq("clinic_id", str(clinic_id)) \
            .gte(campo_fecha, ayer_start_utc).lt(campo_fecha, ayer_end_utc)
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


@router.get("/clinicas/{clinic_id}/analytics")
async def analytics_clinica(clinic_id: UUID, dias: int = 30):
    """Analytics histórico: serie diaria, canales, leads, horas pico."""
    from collections import defaultdict
    db = get_supabase()

    ahora = datetime.now(_APP_TZ)
    inicio_local = ahora.date() - timedelta(days=dias - 1)
    inicio_utc = datetime.combine(inicio_local, time.min, tzinfo=_APP_TZ).astimezone(timezone.utc).isoformat()

    convs = db.table("conversaciones").select("created_at, canal, estado") \
        .eq("clinic_id", str(clinic_id)).gte("created_at", inicio_utc).execute().data or []
    citas = db.table("citas").select("fecha_inicio, estado") \
        .eq("clinic_id", str(clinic_id)).gte("fecha_inicio", inicio_utc).execute().data or []
    leads = db.table("pacientes").select("created_at, estado_lead") \
        .eq("clinic_id", str(clinic_id)).gte("created_at", inicio_utc).execute().data or []
    clinica_row = db.table("clinicas").select(
        "minutos_usados_mes, minutos_incluidos, plan"
    ).eq("id", str(clinic_id)).single().execute().data or {}

    def to_local_date(iso: str) -> str:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(_APP_TZ).date().isoformat()

    daily_convs: dict[str, int] = defaultdict(int)
    daily_citas: dict[str, int] = defaultdict(int)
    daily_leads: dict[str, int] = defaultdict(int)
    for c in convs:
        daily_convs[to_local_date(c["created_at"])] += 1
    for c in citas:
        daily_citas[to_local_date(c["fecha_inicio"])] += 1
    for l in leads:
        daily_leads[to_local_date(l["created_at"])] += 1

    serie_diaria = [
        {
            "fecha": (inicio_local + timedelta(days=i)).isoformat(),
            "conversaciones": daily_convs.get((inicio_local + timedelta(days=i)).isoformat(), 0),
            "citas": daily_citas.get((inicio_local + timedelta(days=i)).isoformat(), 0),
            "leads": daily_leads.get((inicio_local + timedelta(days=i)).isoformat(), 0),
        }
        for i in range(dias)
    ]

    por_canal: dict[str, int] = defaultdict(int)
    for c in convs:
        por_canal[c.get("canal", "chat_web")] += 1

    estados_citas: dict[str, int] = defaultdict(int)
    for c in citas:
        estados_citas[c.get("estado", "confirmada")] += 1

    estado_leads: dict[str, int] = defaultdict(int)
    for l in leads:
        estado_leads[l.get("estado_lead", "nuevo")] += 1

    horas: dict[int, int] = defaultdict(int)
    for c in convs:
        h = datetime.fromisoformat(c["created_at"].replace("Z", "+00:00")).astimezone(_APP_TZ).hour
        horas[h] += 1
    horas_pico = [{"hora": h, "count": horas.get(h, 0)} for h in range(24)]

    total_leads = len(leads)
    convertidos = sum(1 for l in leads if l.get("estado_lead") in ("cita_agendada", "completado"))
    tasa_conversion = round(convertidos / total_leads * 100) if total_leads > 0 else 0
    escalaciones = sum(1 for c in convs if c.get("estado") == "esperando_humano")

    plan = clinica_row.get("plan", "trial")
    from billing import MINUTOS_POR_PLAN
    minutos_incluidos = clinica_row.get("minutos_incluidos") or MINUTOS_POR_PLAN.get(plan, 100)

    return {
        "serie_diaria": serie_diaria,
        "por_canal": dict(por_canal),
        "estados_citas": dict(estados_citas),
        "estado_leads": dict(estado_leads),
        "horas_pico": horas_pico,
        "tasa_conversion": tasa_conversion,
        "escalaciones": escalaciones,
        "totales": {
            "conversaciones": len(convs),
            "citas": len(citas),
            "leads": total_leads,
            "minutos_usados": clinica_row.get("minutos_usados_mes") or 0,
            "minutos_incluidos": minutos_incluidos,
        },
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
async def listar_espera(
    clinic_id: UUID,
    estado: str | None = None,
    limit: int | None = None,
    offset: int | None = None,
):
    db = get_supabase()
    q = db.table("lista_espera").select(
        "*, pacientes(nombre, telefono, email, canal_origen)"
    ).eq("clinic_id", str(clinic_id))
    if estado:
        q = q.eq("estado", estado)
    result = _paginate(q.order("created_at"), limit, offset).execute()
    return result.data


@router.post("/clinicas/{clinic_id}/lista-espera")
async def crear_entrada_espera(clinic_id: UUID, data: dict):
    db = get_supabase()
    clinic_id_str = str(clinic_id)
    paciente_id = str(data["paciente_id"]) if data.get("paciente_id") else None
    profesional_id = str(data["profesional_id"]) if data.get("profesional_id") else None
    if paciente_id and not _exists_in_clinic(db, "pacientes", paciente_id, clinic_id_str):
        raise HTTPException(status_code=404, detail="Paciente no encontrado en la clínica")
    if profesional_id and not _exists_in_clinic(db, "profesionales", profesional_id, clinic_id_str):
        raise HTTPException(status_code=404, detail="Profesional no encontrado en la clínica")
    row = {
        "clinic_id": clinic_id_str,
        "paciente_id": paciente_id,
        "servicio_nombre": data.get("servicio_nombre", "").strip(),
        "profesional_id": profesional_id,
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
async def leads_recuperacion(clinic_id: UUID, limit: int | None = None):
    """Leads fr�os: perdidos o sin cita y sin actividad reciente (>3 d�as)."""
    from scoring import enriquecer_leads

    db = get_supabase()
    hace_3_dias = (datetime.now(_APP_TZ).date() - timedelta(days=3)).isoformat()
    _, cutoff_end_utc = _utc_bounds_for_local_day(hace_3_dias)

    # Leads perdidos
    perdidos = db.table("pacientes").select("*") \
        .eq("clinic_id", str(clinic_id)) \
        .eq("estado_lead", "perdido") \
        .execute().data

    # Leads sin cita (nuevo/interesado/contactado) sin actividad >3 d�as y con tel�fono
    sin_cita = db.table("pacientes").select("*") \
        .eq("clinic_id", str(clinic_id)) \
        .in_("estado_lead", ["nuevo", "interesado", "contactado"]) \
        .neq("telefono", None) \
        .lt("created_at", cutoff_end_utc) \
        .execute().data

    todos = {p["id"]: p for p in perdidos}
    for p in sin_cita:
        todos.setdefault(p["id"], p)

    result = list(todos.values())
    result.sort(key=lambda p: p.get("created_at", ""), reverse=True)
    lim = _DEFAULT_LIST_LIMIT if limit is None else max(1, min(int(limit), _MAX_LIST_LIMIT))
    return enriquecer_leads(result[:lim])


@router.post("/clinicas/{clinic_id}/leads/{lead_id}/seguimiento")
async def disparar_seguimiento(clinic_id: UUID, lead_id: UUID):
    """Crea job inmediato de seguimiento WhatsApp para un lead."""
    db = get_supabase()
    paciente = db.table("pacientes").select("id, clinic_id, telefono") \
        .eq("id", str(lead_id)).eq("clinic_id", str(clinic_id)).single().execute()
    if not paciente.data:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    if not paciente.data.get("telefono"):
        raise HTTPException(status_code=400, detail="El lead no tiene teléfono")

    ahora = datetime.now(timezone.utc)
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

@router.get("/clinicas/{clinic_id}/preflight")
async def preflight_clinica(clinic_id: UUID):
    """
    Comprueba si la clínica puede realmente atender y agendar.

    El checklist de onboarding solo miraba prompt, calendario y número. Faltaban
    las dos cosas que hacen que el agente no pueda dar una cita por mucho que el
    teléfono suene: sin servicios reservables `_get_servicio` no encuentra nada,
    y sin profesionales que acepten reservas IA no hay a quién asignar el hueco.
    En una demo delante del cliente eso se traduce en "deriva a humano" para todo.
    """
    db = get_supabase()
    cid = str(clinic_id)

    clinica = db.table("clinicas").select(
        "nombre, horarios, prompt_personalizado, google_tokens_enc, telefono, "
        "telefono_ia, meta_phone_number_id, notif_webhook, routing_mode"
    ).eq("id", cid).single().execute().data
    if not clinica:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")

    servicios = db.table("servicios").select("id, reservable_ia, requiere_revision") \
        .eq("clinic_id", cid).eq("activo", True).execute().data or []
    servicios_reservables = [
        s for s in servicios if s.get("reservable_ia", True) and not s.get("requiere_revision")
    ]

    profesionales = db.table("profesionales").select("id") \
        .eq("clinic_id", cid).eq("activo", True).eq("acepta_reservas_ia", True).execute().data or []
    prof_ids = [p["id"] for p in profesionales]

    disponibilidad = []
    if prof_ids:
        disponibilidad = db.table("disponibilidad_profesional").select("profesional_id") \
            .in_("profesional_id", prof_ids).eq("activo", True).execute().data or []

    horarios = clinica.get("horarios") or {}
    horarios_ok = isinstance(horarios, dict) and any(
        isinstance(h, dict) and h.get("start") and h.get("end") for h in horarios.values()
    )

    # Un profesional puede heredar el horario de la clínica si no tiene el suyo.
    agenda_ok = bool(prof_ids) and (bool(disponibilidad) or horarios_ok)

    checks = [
        {
            "id": "servicios",
            "label": "Servicios que la IA puede reservar",
            "ok": bool(servicios_reservables),
            "href": "/panel/agenda",
            "bloqueante": True,
            "detalle": f"{len(servicios_reservables)} de {len(servicios)} servicios activos",
        },
        {
            "id": "profesionales",
            "label": "Profesionales con agenda disponible",
            "ok": agenda_ok,
            "href": "/panel/agenda",
            "bloqueante": True,
            "detalle": f"{len(prof_ids)} aceptan reservas IA",
        },
        {
            "id": "horarios",
            "label": "Horario de la clínica definido",
            "ok": horarios_ok,
            "href": "/panel/configuracion",
            "bloqueante": True,
        },
        {
            "id": "canal",
            "label": "Al menos un canal activo (voz o WhatsApp)",
            "ok": bool(clinica.get("telefono_ia") or clinica.get("meta_phone_number_id")),
            "href": "/panel/canales",
            "bloqueante": True,
        },
        {
            "id": "agente",
            "label": "Agente entrenado con la info de la clínica",
            "ok": bool(clinica.get("prompt_personalizado")),
            "href": "/panel/configuracion",
            "bloqueante": False,
        },
        {
            "id": "calendario",
            "label": "Google Calendar conectado",
            "ok": bool(clinica.get("google_tokens_enc")),
            "href": "/panel/configuracion",
            "bloqueante": False,
        },
        {
            "id": "avisos",
            "label": "Aviso configurado para escaladas a humano",
            "ok": bool(clinica.get("notif_webhook")),
            "href": "/panel/configuracion",
            "bloqueante": False,
        },
        {
            "id": "transfer",
            "label": "Teléfono de la clínica para pasar llamadas",
            "ok": bool(clinica.get("telefono")),
            "href": "/panel/canales",
            "bloqueante": False,
        },
    ]

    bloqueantes = [c for c in checks if c["bloqueante"] and not c["ok"]]
    return {
        "clinica": clinica.get("nombre"),
        "puede_agendar": not bloqueantes,
        "bloqueantes": [c["id"] for c in bloqueantes],
        "checks": checks,
    }


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


# Note: /clinicas/{clinic_id}/canales GET/PATCH/DELETE are in routers/canales.py


# ── Test chat (bypasses billing) ──────────────────────────────────────────────

class TestChatBody(BaseModel):
    mensaje: str
    conversacion_id: str | None = None


@router.post("/clinicas/{clinic_id}/test-chat")
async def test_chat(clinic_id: UUID, body: TestChatBody):
    """Test the agent for a clinic without billing checks. Admin only."""
    from agent.core import run_agent
    respuesta, conversacion_id = await run_agent(
        clinic_id=str(clinic_id),
        conversacion_id=body.conversacion_id,
        user_message=body.mensaje,
        canal="chat_web",
        paciente_id=None,
        skip_billing=True,
        is_test=True,
    )
    return {"respuesta": respuesta, "conversacion_id": conversacion_id}


class TestSmsBody(BaseModel):
    telefono: str
    mensaje: str = "Hola, este es un SMS de prueba de Atiende360. Si lo recibes, el sistema funciona correctamente."


@router.post("/test-sms")
async def test_sms(body: TestSmsBody):
    """Envía un SMS de prueba al número indicado. Comprueba que TELNYX_SMS_NUMBER y TELNYX_API_KEY están configurados."""
    import telnyx_sms as sms
    from config import settings
    if not settings.telnyx_api_key or not settings.telnyx_sms_number:
        raise HTTPException(status_code=503, detail=f"Telnyx no configurado — TELNYX_API_KEY={'OK' if settings.telnyx_api_key else 'FALTA'}, TELNYX_SMS_NUMBER={'OK' if settings.telnyx_sms_number else 'FALTA'}")
    ok = await sms.send_sms(to=body.telefono, text=body.mensaje)
    if not ok:
        raise HTTPException(status_code=502, detail="SMS no enviado — revisa los logs de Railway")
    return {"ok": True, "to": body.telefono, "from": settings.telnyx_sms_number}

