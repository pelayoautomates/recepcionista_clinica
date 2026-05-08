import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from database.client import get_supabase
from google_calendar import client as gcal

logger = logging.getLogger(__name__)


async def consultar_disponibilidad(clinic_id: str, fecha: str, tipo_cita: str) -> dict:
    """
    Devuelve los slots libres para una fecha y tipo de cita.
    fecha: YYYY-MM-DD
    """
    db = get_supabase()
    servicios_res = db.table("clinicas").select("servicios").eq("id", clinic_id).single().execute()
    if not servicios_res.data:
        return {"error": f"Clínica {clinic_id} no encontrada"}
    servicios = servicios_res.data.get("servicios") or []
    if isinstance(servicios, dict):
        servicios = []

    duracion = 60
    for s in servicios:
        if isinstance(s, dict) and s.get("nombre", "").lower() == tipo_cita.lower():
            duracion = s.get("duracion_min", 60)
            break

    slots = gcal.listar_slots_libres(UUID(clinic_id), fecha, duracion)
    return {"fecha": fecha, "tipo_cita": tipo_cita, "slots_disponibles": slots}


async def crear_cita(
    clinic_id: str,
    paciente_id: str,
    fecha_inicio_iso: str,
    tipo_cita: str,
    nombre_paciente: str = "Paciente",
) -> dict:
    """
    Crea una cita en Google Calendar y registra en Supabase.
    fecha_inicio_iso: ISO 8601 con timezone
    """
    db = get_supabase()
    servicios_res = db.table("clinicas").select("servicios, nombre").eq("id", clinic_id).single().execute()
    if not servicios_res.data:
        return {"error": f"Clínica {clinic_id} no encontrada"}
    servicios = servicios_res.data.get("servicios") or []
    if isinstance(servicios, dict):
        servicios = []
    nombre_clinica = servicios_res.data.get("nombre") or "Clínica"

    duracion = 60
    for s in servicios:
        if isinstance(s, dict) and s.get("nombre", "").lower() == tipo_cita.lower():
            duracion = s.get("duracion_min", 60)
            break

    fecha_inicio = datetime.fromisoformat(fecha_inicio_iso)
    if fecha_inicio.tzinfo is None:
        fecha_inicio = fecha_inicio.replace(tzinfo=timezone.utc)
    fecha_fin = fecha_inicio + timedelta(minutes=duracion)

    event_id = gcal.crear_evento(
        clinic_id=UUID(clinic_id),
        titulo=f"{tipo_cita} — {nombre_paciente}",
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        descripcion=f"Cita agendada por Recepcionista IA de {nombre_clinica}",
    )

    cita_data = {
        "clinic_id": clinic_id,
        "paciente_id": paciente_id,
        "google_event_id": event_id,
        "tipo_servicio": tipo_cita,
        "fecha_inicio": fecha_inicio.isoformat(),
        "fecha_fin": fecha_fin.isoformat(),
        "estado": "confirmada",
    }
    result = db.table("citas").insert(cita_data).execute()
    cita_id = result.data[0]["id"]

    db.table("pacientes").update({"estado_lead": "cita_agendada"}).eq("id", paciente_id).execute()

    logger.info("Cita %s creada para paciente %s en clínica %s", cita_id, paciente_id, clinic_id)
    return {
        "cita_id": cita_id,
        "google_event_id": event_id,
        "fecha_inicio": fecha_inicio.strftime("%d/%m/%Y %H:%M"),
        "fecha_fin": fecha_fin.strftime("%H:%M"),
        "tipo": tipo_cita,
    }


async def mover_cita(cita_id: str, nueva_fecha_inicio_iso: str) -> dict:
    """Mueve una cita a una nueva fecha/hora."""
    db = get_supabase()
    result = db.table("citas").select("*").eq("id", cita_id).single().execute()
    cita = result.data

    nueva_fecha_inicio = datetime.fromisoformat(nueva_fecha_inicio_iso)
    if nueva_fecha_inicio.tzinfo is None:
        nueva_fecha_inicio = nueva_fecha_inicio.replace(tzinfo=timezone.utc)

    # Calcular duración original
    fecha_inicio_orig = datetime.fromisoformat(cita["fecha_inicio"])
    fecha_fin_orig = datetime.fromisoformat(cita["fecha_fin"])
    duracion = fecha_fin_orig - fecha_inicio_orig
    nueva_fecha_fin = nueva_fecha_inicio + duracion

    gcal.mover_evento(
        clinic_id=UUID(cita["clinic_id"]),
        event_id=cita["google_event_id"],
        nueva_fecha_inicio=nueva_fecha_inicio,
        nueva_fecha_fin=nueva_fecha_fin,
    )

    db.table("citas").update({
        "fecha_inicio": nueva_fecha_inicio.isoformat(),
        "fecha_fin": nueva_fecha_fin.isoformat(),
    }).eq("id", cita_id).execute()

    return {
        "cita_id": cita_id,
        "nueva_fecha_inicio": nueva_fecha_inicio.strftime("%d/%m/%Y %H:%M"),
        "nueva_fecha_fin": nueva_fecha_fin.strftime("%H:%M"),
    }


async def cancelar_cita(cita_id: str) -> dict:
    """Cancela una cita en Google Calendar y Supabase."""
    db = get_supabase()
    result = db.table("citas").select("*").eq("id", cita_id).single().execute()
    cita = result.data

    if cita.get("google_event_id"):
        gcal.cancelar_evento(UUID(cita["clinic_id"]), cita["google_event_id"])

    db.table("citas").update({"estado": "cancelada"}).eq("id", cita_id).execute()

    logger.info("Cita %s cancelada", cita_id)
    return {"cita_id": cita_id, "estado": "cancelada"}
