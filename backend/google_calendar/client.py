import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from googleapiclient.discovery import build

from google_calendar.auth import get_credentials

logger = logging.getLogger(__name__)


def _build_service(clinic_id: UUID):
    creds = get_credentials(clinic_id)
    return build("calendar", "v3", credentials=creds)


def listar_slots_libres(clinic_id: UUID, fecha: str, duracion_min: int = 60) -> list[dict]:
    """
    Devuelve slots libres en el día indicado (formato YYYY-MM-DD).
    Compara los eventos existentes contra el horario de la clínica
    para encontrar huecos >= duracion_min.
    """
    service = _build_service(clinic_id)

    from database.client import get_supabase
    db = get_supabase()
    clinica = db.table("clinicas").select("horarios").eq("id", str(clinic_id)).single().execute()
    horarios = clinica.data.get("horarios", {})

    # Día de la semana abreviado en español
    dias = {0: "lun", 1: "mar", 2: "mie", 3: "jue", 4: "vie", 5: "sab", 6: "dom"}
    fecha_dt = datetime.strptime(fecha, "%Y-%m-%d")
    dia_key = dias[fecha_dt.weekday()]
    horario_dia = horarios.get(dia_key)

    if not horario_dia:
        # Si no hay horarios configurados para ningún día, usar horario por defecto
        if not horarios:
            horario_dia = {"start": "09:00", "end": "19:00"}
        else:
            return []  # Clínica cerrada ese día concreto

    hora_inicio = datetime.strptime(f"{fecha} {horario_dia['start']}", "%Y-%m-%d %H:%M").replace(
        tzinfo=timezone.utc
    )
    hora_fin = datetime.strptime(f"{fecha} {horario_dia['end']}", "%Y-%m-%d %H:%M").replace(
        tzinfo=timezone.utc
    )

    # Obtener eventos del día
    events_result = service.events().list(
        calendarId="primary",
        timeMin=hora_inicio.isoformat(),
        timeMax=hora_fin.isoformat(),
        singleEvents=True,
        orderBy="startTime",
    ).execute()
    eventos = events_result.get("items", [])

    # Calcular huecos libres
    slots = []
    cursor = hora_inicio
    for evento in eventos:
        ev_start_str = evento["start"].get("dateTime", evento["start"].get("date"))
        ev_end_str = evento["end"].get("dateTime", evento["end"].get("date"))
        ev_start = datetime.fromisoformat(ev_start_str.replace("Z", "+00:00"))
        ev_end = datetime.fromisoformat(ev_end_str.replace("Z", "+00:00"))

        while cursor + timedelta(minutes=duracion_min) <= ev_start:
            slots.append({
                "inicio": cursor.strftime("%H:%M"),
                "fin": (cursor + timedelta(minutes=duracion_min)).strftime("%H:%M"),
                "inicio_iso": cursor.isoformat(),
                "fin_iso": (cursor + timedelta(minutes=duracion_min)).isoformat(),
            })
            cursor += timedelta(minutes=duracion_min)
        cursor = max(cursor, ev_end)

    while cursor + timedelta(minutes=duracion_min) <= hora_fin:
        slots.append({
            "inicio": cursor.strftime("%H:%M"),
            "fin": (cursor + timedelta(minutes=duracion_min)).strftime("%H:%M"),
            "inicio_iso": cursor.isoformat(),
            "fin_iso": (cursor + timedelta(minutes=duracion_min)).isoformat(),
        })
        cursor += timedelta(minutes=duracion_min)

    return slots


def crear_evento(
    clinic_id: UUID,
    titulo: str,
    fecha_inicio: datetime,
    fecha_fin: datetime,
    descripcion: str = "",
) -> str:
    """Crea un evento en Google Calendar. Devuelve el event_id."""
    service = _build_service(clinic_id)
    evento = {
        "summary": titulo,
        "description": descripcion,
        "start": {"dateTime": fecha_inicio.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": fecha_fin.isoformat(), "timeZone": "UTC"},
    }
    result = service.events().insert(calendarId="primary", body=evento).execute()
    logger.info("Evento creado en GCal: %s", result["id"])
    return result["id"]


def mover_evento(clinic_id: UUID, event_id: str, nueva_fecha_inicio: datetime, nueva_fecha_fin: datetime) -> None:
    service = _build_service(clinic_id)
    evento = service.events().get(calendarId="primary", eventId=event_id).execute()
    evento["start"] = {"dateTime": nueva_fecha_inicio.isoformat(), "timeZone": "UTC"}
    evento["end"] = {"dateTime": nueva_fecha_fin.isoformat(), "timeZone": "UTC"}
    service.events().update(calendarId="primary", eventId=event_id, body=evento).execute()
    logger.info("Evento %s movido en GCal", event_id)


def cancelar_evento(clinic_id: UUID, event_id: str) -> None:
    service = _build_service(clinic_id)
    service.events().delete(calendarId="primary", eventId=event_id).execute()
    logger.info("Evento %s cancelado en GCal", event_id)
