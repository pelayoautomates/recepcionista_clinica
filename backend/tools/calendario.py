"""
Capa de scheduling centralizada para el agente IA.

find_available_slots() — función única que comprueba TODAS las restricciones:
  - Horario clínica (reglas_reserva + horarios JSONB)
  - Disponibilidad del profesional (disponibilidad_profesional)
  - Bloques de agenda (vacaciones, comidas, formación…)
  - Citas existentes (incluyendo buffer antes/después)
  - Google Calendar si está conectado

create_appointment_validated() — crea cita con todas las validaciones en orden.
"""

import asyncio
import logging
from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from audit import CITA_CANCELAR, CITA_CREAR, CITA_MOVER, audit
from database.client import get_supabase
from google_calendar import client as gcal
import whatsapp as wa

TZ = ZoneInfo("Europe/Madrid")

logger = logging.getLogger(__name__)

_DIAS_ISO = {0: "lun", 1: "mar", 2: "mie", 3: "jue", 4: "vie", 5: "sab", 6: "dom"}


# ─── Helpers internos ────────────────────────────────────────────────────────


def _parse_time(t: str) -> time:
    """HH:MM → time."""
    h, m = t.split(":")
    return time(int(h), int(m))


def _slots_en_rango(inicio: datetime, fin: datetime, duracion_total: int, intervalo: int) -> list[datetime]:
    """Genera lista de datetimes candidatos cada `intervalo` min dentro de [inicio, fin - duracion_total]."""
    slots = []
    cursor = inicio
    limite = fin - timedelta(minutes=duracion_total)
    while cursor <= limite:
        slots.append(cursor)
        cursor += timedelta(minutes=intervalo)
    return slots


def _get_clinic(db, clinic_id: str) -> dict:
    r = db.table("clinicas").select(
        "id, nombre, horarios, reglas_reserva, google_tokens_enc, notif_webhook, "
        "meta_phone_number_id, meta_access_token"
    ).eq("id", clinic_id).single().execute()
    return r.data or {}


def _get_servicio(db, clinic_id: str, nombre_servicio: str) -> dict | None:
    """Busca servicio por nombre (case-insensitive) en tabla servicios."""
    r = db.table("servicios").select(
        "id, nombre, duracion_min, buffer_antes_min, buffer_despues_min, reservable_ia, "
        "requiere_revision, sala_id"
    ).eq("clinic_id", clinic_id).eq("activo", True).execute()
    for s in (r.data or []):
        if s["nombre"].lower() == nombre_servicio.lower():
            return s
    return None


def _get_profesionales_validos(db, clinic_id: str, servicio_id: str | None, profesional_id_pref: str | None) -> list[dict]:
    """
    Devuelve profesionales activos que pueden atender el servicio.
    Si profesional_id_pref está especificado, devuelve solo ese (si puede).
    Si servicio_id es None, devuelve todos los activos.
    """
    query = db.table("profesionales").select(
        "id, nombre, activo, acepta_reservas_ia, prioridad"
    ).eq("clinic_id", clinic_id).eq("activo", True).eq("acepta_reservas_ia", True)
    if profesional_id_pref:
        query = query.eq("id", profesional_id_pref)
    profs = query.order("prioridad", desc=True).order("nombre").execute().data or []

    if not servicio_id:
        return profs

    # Filtrar por servicio_profesional si hay registros; si no hay ninguno configurado → todos válidos
    sp = db.table("servicio_profesional").select("profesional_id").eq("servicio_id", servicio_id).execute().data or []
    if not sp:
        return profs  # sin restricción → todos válidos
    validos = {row["profesional_id"] for row in sp}
    return [p for p in profs if p["id"] in validos]


def _bloques_activos(db, clinic_id: str, fecha_inicio: datetime, fecha_fin: datetime, profesional_id: str | None) -> list[dict]:
    """Bloques de agenda que afectan el rango dado (toda la clínica o el profesional específico)."""
    query = db.table("bloques_agenda").select(
        "fecha_inicio, fecha_fin, profesional, profesional_id"
    ).eq("clinic_id", clinic_id).lt("fecha_inicio", fecha_fin.isoformat()).gt("fecha_fin", fecha_inicio.isoformat())
    result = query.execute().data or []
    filtrados = []
    for b in result:
        if b.get("profesional_id"):
            # Bloque de un profesional concreto
            if profesional_id and b.get("profesional_id") == profesional_id:
                filtrados.append(b)
        else:
            # Sin profesional_id: bloque global, o bien uno antiguo que solo
            # guardaba el nombre en el campo TEXT `profesional`. Ese segundo caso
            # se ignoraba por completo, así que un bloqueo heredado no impedía
            # reservar encima. Se tratan como globales: perder un hueco es menos
            # grave que agendar sobre una ausencia real.
            filtrados.append(b)
    return filtrados


def _sala_solapada(db, clinic_id: str, sala_id: str, fecha_inicio: datetime, fecha_fin: datetime) -> bool:
    """Devuelve True si la sala ya está ocupada en ese rango."""
    r = db.table("citas").select("id").eq("clinic_id", clinic_id).eq(
        "sala_id", sala_id
    ).not_.in_("estado", ["cancelada", "no_asistio"]).lt(
        "fecha_inicio", fecha_fin.isoformat()
    ).gt("fecha_fin", fecha_inicio.isoformat()).execute()
    return bool(r.data)


def _citas_solapadas(db, clinic_id: str, profesional_id: str, fecha_inicio: datetime, fecha_fin: datetime) -> list[dict]:
    """Citas existentes que solapan con el slot propuesto (incluyendo buffers ya guardados en fecha_fin)."""
    r = db.table("citas").select("id, fecha_inicio, fecha_fin").eq("clinic_id", clinic_id).eq(
        "profesional_id", profesional_id
    ).not_.in_("estado", ["cancelada", "no_asistio"]).lt(
        "fecha_inicio", fecha_fin.isoformat()
    ).gt("fecha_fin", fecha_inicio.isoformat()).execute()
    return r.data or []


def _gcal_ocupado(clinic_id: str, fecha_inicio: datetime, fecha_fin: datetime, clinic: dict) -> bool:
    """Devuelve True si Google Calendar marca ese rango como ocupado."""
    if not clinic.get("google_tokens_enc"):
        return False
    try:
        eventos = gcal.listar_eventos_rango(UUID(clinic_id), fecha_inicio, fecha_fin)
        return len(eventos) > 0
    except Exception as exc:
        # Fallo en abierto a propósito: bloquear toda la agenda porque Google no
        # responde sería peor durante una llamada en curso. Se registra como ERROR
        # (no warning) porque implica que se puede reservar sobre un evento que
        # existe en el calendario y nadie lo va a ver hasta que ocurra.
        logger.error("GCal check failed for clinic %s — se asume libre: %s", clinic_id, exc)
        return False


def _parse_dt(value) -> datetime | None:
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=TZ)


def _solapa(inicio_a: datetime, fin_a: datetime, intervalos: list[tuple[datetime, datetime]]) -> bool:
    return any(inicio_a < fin_b and fin_a > inicio_b for inicio_b, fin_b in intervalos)


def _cargar_contexto_dia(
    db,
    clinic_id: str,
    prof_ids: list[str],
    dia_inicio: datetime,
    dia_fin: datetime,
    dia_semana: int,
    clinic: dict,
) -> dict:
    """
    Carga de una sola vez todo lo que restringe la agenda de un dia concreto.

    Antes se consultaba la base de datos (y Google Calendar) una vez por cada slot
    candidato y profesional: en una llamada de voz eso son decenas de round-trips
    secuenciales antes de poder proponer un hueco. Aqui se hace una consulta por
    tipo de restriccion y el resto se resuelve en memoria.
    """
    disponibilidad: dict[str, tuple[time, time]] = {}
    citas_por_prof: dict[str, list[tuple[datetime, datetime]]] = {pid: [] for pid in prof_ids}
    bloques_globales: list[tuple[datetime, datetime]] = []
    bloques_por_prof: dict[str, list[tuple[datetime, datetime]]] = {pid: [] for pid in prof_ids}
    gcal_ocupado: list[tuple[datetime, datetime]] = []

    if prof_ids:
        disp_rows = db.table("disponibilidad_profesional").select(
            "profesional_id, hora_inicio, hora_fin"
        ).in_("profesional_id", prof_ids).eq("dia_semana", dia_semana).eq("activo", True).execute().data or []
        for row in disp_rows:
            pid = row.get("profesional_id")
            if pid and pid not in disponibilidad:
                disponibilidad[pid] = (_parse_time(row["hora_inicio"]), _parse_time(row["hora_fin"]))

        citas_rows = db.table("citas").select(
            "profesional_id, fecha_inicio, fecha_fin"
        ).eq("clinic_id", clinic_id).in_("profesional_id", prof_ids).not_.in_(
            "estado", ["cancelada", "no_asistio"]
        ).lt("fecha_inicio", dia_fin.isoformat()).gt("fecha_fin", dia_inicio.isoformat()).execute().data or []
        for row in citas_rows:
            inicio = _parse_dt(row.get("fecha_inicio"))
            fin = _parse_dt(row.get("fecha_fin"))
            pid = row.get("profesional_id")
            if inicio and fin and pid in citas_por_prof:
                citas_por_prof[pid].append((inicio, fin))

    bloques_rows = db.table("bloques_agenda").select(
        "fecha_inicio, fecha_fin, profesional, profesional_id"
    ).eq("clinic_id", clinic_id).lt("fecha_inicio", dia_fin.isoformat()).gt(
        "fecha_fin", dia_inicio.isoformat()
    ).execute().data or []
    for row in bloques_rows:
        inicio = _parse_dt(row.get("fecha_inicio"))
        fin = _parse_dt(row.get("fecha_fin"))
        if not inicio or not fin:
            continue
        pid = row.get("profesional_id")
        if pid:
            bloques_por_prof.setdefault(pid, []).append((inicio, fin))
        else:
            # Incluye los bloques antiguos que solo tienen el nombre en `profesional`
            # (ver _bloques_activos): se aplican a todos para no reservar encima.
            bloques_globales.append((inicio, fin))

    if clinic.get("google_tokens_enc"):
        try:
            for evento in gcal.listar_eventos_rango(UUID(clinic_id), dia_inicio, dia_fin):
                start = evento.get("start") or {}
                end = evento.get("end") or {}
                inicio = _parse_dt(start.get("dateTime") or start.get("date"))
                fin = _parse_dt(end.get("dateTime") or end.get("date"))
                if inicio and fin:
                    gcal_ocupado.append((inicio, fin))
        except Exception as exc:
            logger.error("GCal day fetch failed for clinic %s — se ofrecen huecos sin contrastar: %s", clinic_id, exc)

    return {
        "disponibilidad": disponibilidad,
        "citas": citas_por_prof,
        "bloques_globales": bloques_globales,
        "bloques_prof": bloques_por_prof,
        "gcal": gcal_ocupado,
    }


# ─── API pública ─────────────────────────────────────────────────────────────


async def find_available_slots(
    clinic_id: str,
    servicio_nombre: str,
    fecha: str,  # YYYY-MM-DD
    profesional_id_pref: str | None = None,
    max_slots: int = 8,
) -> dict:
    """
    Devuelve slots disponibles para el servicio en la fecha indicada.
    Comprueba: reglas_reserva, horarios clínica, disponibilidad_profesional,
    bloques_agenda, citas existentes (con buffer), Google Calendar.

    El trabajo real es síncrono (cliente de Supabase y API de Google), así que
    se ejecuta en un hilo: dentro del event loop bloqueaba a todas las demás
    conversaciones en curso mientras duraba la consulta.
    """
    return await asyncio.to_thread(
        _find_available_slots_sync,
        clinic_id,
        servicio_nombre,
        fecha,
        profesional_id_pref,
        max_slots,
    )


def _find_available_slots_sync(
    clinic_id: str,
    servicio_nombre: str,
    fecha: str,
    profesional_id_pref: str | None = None,
    max_slots: int = 8,
) -> dict:
    db = get_supabase()
    clinic = _get_clinic(db, clinic_id)
    if not clinic:
        return {"error": f"Clínica {clinic_id} no encontrada"}

    reglas: dict = clinic.get("reglas_reserva") or {}
    antelacion_min_h: int = reglas.get("antelacion_min_horas", 1)
    max_dias: int = reglas.get("max_dias_adelante", 60)
    intervalo: int = reglas.get("intervalo_slots_min", 30)
    permite_mismo_dia: bool = reglas.get("permite_mismo_dia", True)

    hoy = datetime.now(TZ)
    fecha_dt = datetime.strptime(fecha, "%Y-%m-%d").replace(tzinfo=TZ)
    dias_adelante = (fecha_dt.date() - hoy.date()).days

    if dias_adelante < 0:
        return {"error": "La fecha ya pasó", "slots_disponibles": []}
    if not permite_mismo_dia and dias_adelante == 0:
        return {"error": "La clínica no acepta citas el mismo día", "slots_disponibles": []}
    if dias_adelante > max_dias:
        return {"error": f"Solo se puede reservar con {max_dias} días de antelación máximo", "slots_disponibles": []}

    # Servicio
    servicio = _get_servicio(db, clinic_id, servicio_nombre)
    if not servicio:
        return {
            "error": f"Servicio '{servicio_nombre}' no encontrado. Deriva a humano para confirmar duración.",
            "slots_disponibles": [],
        }
    if not servicio.get("reservable_ia", True) or servicio.get("requiere_revision"):
        return {
            "error": f"El servicio '{servicio_nombre}' requiere confirmación humana.",
            "slots_disponibles": [],
        }

    duracion: int = servicio["duracion_min"]
    buffer_antes: int = servicio.get("buffer_antes_min") or 0
    buffer_despues: int = servicio.get("buffer_despues_min") or 0
    duracion_total: int = buffer_antes + duracion + buffer_despues

    # Profesionales válidos
    profs = _get_profesionales_validos(db, clinic_id, servicio.get("id"), profesional_id_pref)
    if not profs:
        return {"error": "No hay profesionales disponibles para este servicio", "slots_disponibles": []}

    dia_semana = fecha_dt.weekday()  # 0=lunes
    dia_key = _DIAS_ISO.get(dia_semana, "")
    horarios_clinica: dict = clinic.get("horarios") or {}
    horario_dia = horarios_clinica.get(dia_key)

    slots_resultado = []
    ahora_mas_antelacion = hoy + timedelta(hours=antelacion_min_h)

    dia_inicio = fecha_dt.replace(hour=0, minute=0, second=0, microsecond=0)
    dia_fin = dia_inicio + timedelta(days=1)
    ctx = _cargar_contexto_dia(
        db, clinic_id, [p["id"] for p in profs], dia_inicio, dia_fin, dia_semana, clinic
    )

    for prof in profs:
        pid = prof["id"]

        # Disponibilidad del profesional ese día
        disp = ctx["disponibilidad"].get(pid)
        if disp:
            inicio_trabajo, fin_trabajo = disp
        elif horario_dia:
            inicio_trabajo = _parse_time(horario_dia["start"])
            fin_trabajo = _parse_time(horario_dia["end"])
        else:
            continue  # ni prof ni clínica trabajan ese día

        ocupado_prof = (
            ctx["citas"].get(pid, [])
            + ctx["bloques_prof"].get(pid, [])
            + ctx["bloques_globales"]
            + ctx["gcal"]
        )

        rango_inicio = fecha_dt.replace(
            hour=inicio_trabajo.hour, minute=inicio_trabajo.minute, second=0, microsecond=0, tzinfo=TZ
        )
        rango_fin = fecha_dt.replace(
            hour=fin_trabajo.hour, minute=fin_trabajo.minute, second=0, microsecond=0, tzinfo=TZ
        )

        candidatos = _slots_en_rango(rango_inicio, rango_fin, duracion_total, intervalo)

        for candidato in candidatos:
            # Antelación mínima
            if candidato < ahora_mas_antelacion:
                continue

            slot_inicio_real = candidato + timedelta(minutes=buffer_antes)
            slot_fin_real = slot_inicio_real + timedelta(minutes=duracion)
            slot_fin_con_buffer = slot_fin_real + timedelta(minutes=buffer_despues)

            # Bloques, citas existentes y Google Calendar (precargados arriba)
            if _solapa(candidato, slot_fin_con_buffer, ocupado_prof):
                continue

            slots_resultado.append({
                "inicio_iso": slot_inicio_real.isoformat(),
                "fin_iso": slot_fin_real.isoformat(),
                "inicio": slot_inicio_real.strftime("%H:%M"),
                "fin": slot_fin_real.strftime("%H:%M"),
                "profesional": prof["nombre"],
                "profesional_id": pid,
                "duracion_min": duracion,
            })

            if len(slots_resultado) >= max_slots:
                break

        if len(slots_resultado) >= max_slots:
            break

    if not slots_resultado:
        return {
            "fecha": fecha,
            "servicio": servicio_nombre,
            "slots_disponibles": [],
            "mensaje": "No hay disponibilidad en esa fecha. Prueba otra fecha o deriva a humano.",
        }

    return {
        "fecha": fecha,
        "servicio": servicio_nombre,
        "duracion_min": duracion,
        "slots_disponibles": slots_resultado,
    }


async def create_appointment_validated(
    clinic_id: str,
    paciente_id: str,
    servicio_nombre: str,
    fecha_inicio_iso: str,
    profesional_id: str | None = None,
    sala_id: str | None = None,
    conversacion_id: str | None = None,
    nombre_paciente: str = "Paciente",
    origen: str = "ia_chat",
) -> dict:
    """
    Crea una cita validando todas las restricciones en orden:
    1. Servicio existe y es reservable por IA
    2. Profesional válido para el servicio
    3. Slot sigue libre (bloques + citas existentes + GCal)
    4. Crea en Supabase + Google Calendar si conectado
    """
    db = get_supabase()
    clinic = _get_clinic(db, clinic_id)
    if not clinic:
        return {"error": f"Clínica {clinic_id} no encontrada"}

    servicio = _get_servicio(db, clinic_id, servicio_nombre)
    if not servicio:
        return {"error": f"Servicio '{servicio_nombre}' no encontrado. Deriva a humano."}
    if not servicio.get("reservable_ia", True):
        return {"error": f"'{servicio_nombre}' requiere confirmación humana. Escala la conversación."}
    if servicio.get("requiere_revision"):
        return {"error": f"'{servicio_nombre}' requiere revisión humana antes de agendar."}

    duracion: int = servicio["duracion_min"]
    buffer_antes: int = servicio.get("buffer_antes_min") or 0
    buffer_despues: int = servicio.get("buffer_despues_min") or 0

    fecha_inicio = datetime.fromisoformat(fecha_inicio_iso)
    if fecha_inicio.tzinfo is None:
        fecha_inicio = fecha_inicio.replace(tzinfo=TZ)
    fecha_fin = fecha_inicio + timedelta(minutes=duracion)
    slot_inicio_con_buffer = fecha_inicio - timedelta(minutes=buffer_antes)
    slot_fin_con_buffer = fecha_fin + timedelta(minutes=buffer_despues)

    # Validar profesional
    if profesional_id:
        profs = _get_profesionales_validos(db, clinic_id, servicio.get("id"), profesional_id)
        if not profs:
            return {"error": f"El profesional seleccionado no puede realizar '{servicio_nombre}'."}
        prof_nombre = profs[0]["nombre"]
    else:
        # Auto-asignar el primero disponible
        profs = _get_profesionales_validos(db, clinic_id, servicio.get("id"), None)
        prof_disponible = None
        for p in profs:
            if _bloques_activos(db, clinic_id, slot_inicio_con_buffer, slot_fin_con_buffer, p["id"]):
                continue
            if _citas_solapadas(db, clinic_id, p["id"], slot_inicio_con_buffer, slot_fin_con_buffer):
                continue
            prof_disponible = p
            break
        if not prof_disponible:
            return {"error": "No hay profesional disponible para ese horario. Propón otro slot."}
        profesional_id = prof_disponible["id"]
        prof_nombre = prof_disponible["nombre"]

    # Validar bloques para el profesional elegido
    if _bloques_activos(db, clinic_id, slot_inicio_con_buffer, slot_fin_con_buffer, profesional_id):
        return {"error": "El profesional tiene un bloqueo en ese horario. Propón otro slot."}

    # Validar citas existentes
    if _citas_solapadas(db, clinic_id, profesional_id, slot_inicio_con_buffer, slot_fin_con_buffer):
        return {"error": "El slot ya está ocupado. Propón otro horario."}

    # Google Calendar
    if _gcal_ocupado(clinic_id, slot_inicio_con_buffer, slot_fin_con_buffer, clinic):
        return {"error": "Google Calendar marca ese horario como ocupado. Propón otro slot."}

    # Validar sala si aplica
    sala_final = sala_id or servicio.get("sala_id")
    if sala_final and _sala_solapada(db, clinic_id, sala_final, slot_inicio_con_buffer, slot_fin_con_buffer):
        return {"error": "La sala asignada ya está ocupada en ese horario. Propón otro slot."}

    # Crear en Supabase
    cita_data: dict[str, Any] = {
        "clinic_id": clinic_id,
        "paciente_id": paciente_id,
        "tipo_servicio": servicio_nombre,
        "fecha_inicio": fecha_inicio.isoformat(),
        "fecha_fin": fecha_fin.isoformat(),
        "estado": "confirmada",
        "profesional_id": profesional_id,
        "duracion_min": duracion,
        "paciente_nombre": nombre_paciente,
        "origen": origen,
    }
    if sala_id:
        cita_data["sala_id"] = sala_id
    elif servicio.get("sala_id"):
        cita_data["sala_id"] = servicio["sala_id"]
    if conversacion_id:
        cita_data["conversacion_id"] = conversacion_id

    result = db.table("citas").insert(cita_data).execute()
    cita = result.data[0]
    cita_id = cita["id"]

    # Vincular conversación → cita
    if conversacion_id:
        try:
            db.table("conversaciones").update({"cita_id": cita_id}).eq("id", conversacion_id).eq("clinic_id", clinic_id).execute()
        except Exception as exc:
            logger.warning("No se pudo vincular conversación %s a cita %s: %s", conversacion_id, cita_id, exc)

    # Actualizar estado lead
    db.table("pacientes").update({"estado_lead": "cita_agendada"}).eq("id", paciente_id).eq("clinic_id", clinic_id).execute()

    # Google Calendar
    event_id = None
    gcal_sync_error = None
    if clinic.get("google_tokens_enc"):
        try:
            event_id = gcal.crear_evento(
                clinic_id=UUID(clinic_id),
                titulo=f"{servicio_nombre} — {nombre_paciente}",
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                descripcion=f"Cita con {prof_nombre}. Agendada por Recepcionista IA.",
            )
            if not event_id:
                raise RuntimeError("Google Calendar no devolvió event_id")
            db.table("citas").update({"google_event_id": event_id}).eq("id", cita_id).eq("clinic_id", clinic_id).execute()
        except Exception as exc:
            gcal_sync_error = "La cita se guardó, pero Google Calendar no confirmó la sincronización"
            logger.warning("GCal sync failed for cita %s: %s", cita_id, exc)
            db.table("citas").update({"estado": "sync_failed"}).eq("id", cita_id).eq("clinic_id", clinic_id).execute()

    logger.info("Cita %s creada — profesional=%s servicio=%s", cita_id, prof_nombre, servicio_nombre)
    await _notificar_clinica_nueva_cita(clinic, servicio_nombre, prof_nombre, fecha_inicio, nombre_paciente, origen)

    # Confirmación al paciente por WhatsApp (si tiene teléfono y WhatsApp configurado)
    try:
        pac = db.table("pacientes").select("telefono").eq("id", paciente_id).eq("clinic_id", clinic_id).single().execute()
        telefono_pac = pac.data.get("telefono") if pac.data else None
        if telefono_pac:
            access_token = None
            if clinic.get("meta_access_token"):
                from cryptography.fernet import Fernet
                from config import settings
                access_token = Fernet(settings.fernet_key.encode()).decrypt(
                    clinic["meta_access_token"].encode()
                ).decode()
            await wa.confirmacion_cita(
                to=telefono_pac,
                nombre_paciente=nombre_paciente,
                nombre_clinica=clinic.get("nombre", "la clínica"),
                servicio=servicio_nombre,
                profesional=prof_nombre,
                fecha_texto=fecha_inicio.strftime("%d/%m/%Y a las %H:%M"),
                clinic_whatsapp_number=clinic.get("meta_phone_number_id"),
                access_token=access_token,
            )
    except Exception as exc:
        logger.warning("Confirmación WA paciente fallida para cita %s: %s", cita_id, exc)

    await audit(
        clinic_id=clinic_id,
        actor="ia",
        accion=CITA_CREAR,
        entidad="citas",
        entidad_id=cita_id,
        datos_despues={
            "servicio": servicio_nombre,
            "profesional": prof_nombre,
            "fecha_inicio": fecha_inicio.isoformat(),
            "paciente_id": paciente_id,
            "origen": origen,
        },
        canal=origen,
    )

    return {
        "ok": gcal_sync_error is None,
        "error": gcal_sync_error,
        "cita_id": cita_id,
        "google_event_id": event_id,
        "fecha_inicio": fecha_inicio.strftime("%d/%m/%Y %H:%M"),
        "fecha_fin": fecha_fin.strftime("%H:%M"),
        "servicio": servicio_nombre,
        "profesional": prof_nombre,
        "duracion_min": duracion,
    }


async def _notificar_clinica_nueva_cita(
    clinic: dict,
    servicio: str,
    profesional: str,
    fecha_inicio: datetime,
    paciente: str,
    origen: str,
) -> None:
    """Envía notificación a la clínica por webhook (Slack/Make/Zapier) cuando el agente agenda una cita."""
    try:
        from config import settings
        import httpx as _httpx

        canal_label = {"ia_llamada": "Llamada", "ia_whatsapp": "WhatsApp", "ia_chat": "Webchat"}.get(origen, origen)
        texto = (
            f"Nueva cita agendada por IA ({canal_label})\n"
            f"Paciente: {paciente}\n"
            f"Servicio: {servicio}\n"
            f"Profesional: {profesional}\n"
            f"Fecha: {fecha_inicio.strftime('%d/%m/%Y %H:%M')}\n"
            f"Clínica: {clinic.get('nombre', '')}"
        )

        webhook_url = clinic.get("notif_webhook") or settings.notify_webhook_url
        if webhook_url:
            from outbound import validate_public_http_url
            validate_public_http_url(webhook_url, https_only=settings.is_production)
            async with _httpx.AsyncClient(timeout=5, follow_redirects=False) as client:
                response = await client.post(
                    webhook_url,
                    json={"text": texto, "username": "Atiende360", "tipo": "nueva_cita"},
                )
                response.raise_for_status()
    except Exception as exc:
        logger.warning("Notificación clínica fallida: %s", exc)


async def buscar_citas_paciente(clinic_id: str, paciente_id: str) -> dict:
    """Devuelve las citas futuras y recientes del paciente para que el agente pueda moverlas/cancelarlas."""
    db = get_supabase()
    ahora = datetime.now(timezone.utc)
    hace_30d = ahora - timedelta(days=30)

    r = db.table("citas").select(
        "id, tipo_servicio, fecha_inicio, fecha_fin, estado, profesional_id"
    ).eq("clinic_id", clinic_id).eq("paciente_id", paciente_id).gte(
        "fecha_inicio", hace_30d.isoformat()
    ).not_.in_("estado", ["cancelada"]).order("fecha_inicio").execute()

    citas = r.data or []
    futuras = [c for c in citas if c["fecha_inicio"] >= ahora.isoformat()]
    pasadas = [c for c in citas if c["fecha_inicio"] < ahora.isoformat()]

    return {
        "citas_futuras": [
            {
                "cita_id": c["id"],
                "servicio": c["tipo_servicio"],
                "fecha": datetime.fromisoformat(c["fecha_inicio"]).strftime("%d/%m/%Y %H:%M"),
                "fecha_inicio_iso": c["fecha_inicio"],
                "estado": c["estado"],
            }
            for c in futuras
        ],
        "citas_recientes": [
            {
                "cita_id": c["id"],
                "servicio": c["tipo_servicio"],
                "fecha": datetime.fromisoformat(c["fecha_inicio"]).strftime("%d/%m/%Y %H:%M"),
                "estado": c["estado"],
            }
            for c in pasadas[-3:]
        ],
    }


# ─── Wrappers legacy para el agente ──────────────────────────────────────────


async def consultar_disponibilidad(clinic_id: str, fecha: str, tipo_cita: str, profesional_id: str | None = None) -> dict:
    """Wrapper para compatibilidad con tool definitions."""
    return await find_available_slots(clinic_id, tipo_cita, fecha, profesional_id)


async def crear_cita(
    clinic_id: str,
    paciente_id: str,
    fecha_inicio_iso: str,
    tipo_cita: str,
    nombre_paciente: str = "Paciente",
    profesional_id: str | None = None,
    conversacion_id: str | None = None,
    origen: str = "ia_chat",
) -> dict:
    """Wrapper para compatibilidad con tool definitions."""
    return await create_appointment_validated(
        clinic_id=clinic_id,
        paciente_id=paciente_id,
        servicio_nombre=tipo_cita,
        fecha_inicio_iso=fecha_inicio_iso,
        profesional_id=profesional_id,
        conversacion_id=conversacion_id,
        nombre_paciente=nombre_paciente,
        origen=origen,
    )


async def mover_cita(clinic_id: str, cita_id: str, nueva_fecha_inicio_iso: str) -> dict:
    """Mueve una cita a nueva fecha validando disponibilidad."""
    db = get_supabase()
    result = db.table("citas").select("*").eq("id", cita_id).eq("clinic_id", clinic_id).single().execute()
    cita = result.data
    if not cita:
        return {"error": f"Cita {cita_id} no encontrada"}

    nueva_fecha_inicio = datetime.fromisoformat(nueva_fecha_inicio_iso)
    if nueva_fecha_inicio.tzinfo is None:
        nueva_fecha_inicio = nueva_fecha_inicio.replace(tzinfo=TZ)

    fecha_inicio_orig = datetime.fromisoformat(cita["fecha_inicio"])
    fecha_fin_orig = datetime.fromisoformat(cita["fecha_fin"])
    duracion = fecha_fin_orig - fecha_inicio_orig
    nueva_fecha_fin = nueva_fecha_inicio + duracion

    profesional_id = cita.get("profesional_id")
    # Validar conflictos en nuevo slot
    if profesional_id:
        if _bloques_activos(db, clinic_id, nueva_fecha_inicio, nueva_fecha_fin, profesional_id):
            return {"error": "El profesional tiene un bloqueo en el nuevo horario."}
        conflictos = db.table("citas").select("id").eq("clinic_id", clinic_id).eq(
            "profesional_id", profesional_id
        ).not_.in_("estado", ["cancelada", "no_asistio"]).neq("id", cita_id).lt(
            "fecha_inicio", nueva_fecha_fin.isoformat()
        ).gt("fecha_fin", nueva_fecha_inicio.isoformat()).execute()
        if conflictos.data:
            return {"error": "Conflicto de horario en el nuevo slot. Propón otro."}

    clinic = _get_clinic(db, clinic_id)

    # La sala reservada tiene que seguir libre en el nuevo horario.
    sala_id = cita.get("sala_id")
    if sala_id:
        ocupada = db.table("citas").select("id").eq("clinic_id", clinic_id).eq(
            "sala_id", sala_id
        ).not_.in_("estado", ["cancelada", "no_asistio"]).neq("id", cita_id).lt(
            "fecha_inicio", nueva_fecha_fin.isoformat()
        ).gt("fecha_fin", nueva_fecha_inicio.isoformat()).execute()
        if ocupada.data:
            return {"error": "La sala está ocupada en el nuevo horario. Propón otro slot."}

    # Google Calendar puede tener eventos que la agenda interna no conoce.
    if _gcal_ocupado(clinic_id, nueva_fecha_inicio, nueva_fecha_fin, clinic):
        return {"error": "Google Calendar marca ese horario como ocupado. Propón otro slot."}

    # Actualizar GCal. Si el calendario no confirma el movimiento se marca la cita
    # como sync_failed en vez de dejar dos horarios distintos sin avisar a nadie.
    gcal_sync_error = None
    if cita.get("google_event_id"):
        try:
            gcal.mover_evento(
                clinic_id=UUID(clinic_id),
                event_id=cita["google_event_id"],
                nueva_fecha_inicio=nueva_fecha_inicio,
                nueva_fecha_fin=nueva_fecha_fin,
            )
        except Exception as exc:
            gcal_sync_error = "La cita se movió, pero Google Calendar no confirmó el cambio"
            logger.warning("GCal move failed for cita %s: %s", cita_id, exc)

    db.table("citas").update({
        "fecha_inicio": nueva_fecha_inicio.isoformat(),
        "fecha_fin": nueva_fecha_fin.isoformat(),
        "estado": "sync_failed" if gcal_sync_error else "confirmada",
    }).eq("id", cita_id).eq("clinic_id", clinic_id).execute()

    # Cancelar jobs de recordatorio anteriores — el scheduler creará nuevos con la fecha correcta
    db.table("jobs").update({"estado": "cancelado"}).in_(
        "idempotency_key", [f"recordatorio_24h_{cita_id}", f"recordatorio_1h_{cita_id}"]
    ).eq("estado", "pendiente").execute()

    await audit(
        clinic_id=clinic_id,
        actor="ia",
        accion=CITA_MOVER,
        entidad="citas",
        entidad_id=cita_id,
        datos_antes={"fecha_inicio": cita["fecha_inicio"], "fecha_fin": cita["fecha_fin"]},
        datos_despues={"fecha_inicio": nueva_fecha_inicio.isoformat(), "fecha_fin": nueva_fecha_fin.isoformat()},
    )

    return {
        "ok": gcal_sync_error is None,
        "error": gcal_sync_error,
        "cita_id": cita_id,
        "nueva_fecha_inicio": nueva_fecha_inicio.strftime("%d/%m/%Y %H:%M"),
        "nueva_fecha_fin": nueva_fecha_fin.strftime("%H:%M"),
        "estado": "reprogramada",
    }


async def cancelar_cita(clinic_id: str, cita_id: str) -> dict:
    """Cancela una cita en Supabase y Google Calendar."""
    db = get_supabase()
    result = db.table("citas").select("*").eq("id", cita_id).eq("clinic_id", clinic_id).single().execute()
    cita = result.data
    if not cita:
        return {"error": f"Cita {cita_id} no encontrada"}

    if cita.get("google_event_id"):
        try:
            gcal.cancelar_evento(UUID(cita["clinic_id"]), cita["google_event_id"])
        except Exception as exc:
            logger.warning("GCal cancel failed: %s", exc)

    db.table("citas").update({"estado": "cancelada"}).eq("id", cita_id).eq("clinic_id", clinic_id).execute()

    # Cancelar jobs de recordatorio pendientes
    db.table("jobs").update({"estado": "cancelado"}).in_(
        "idempotency_key", [f"recordatorio_24h_{cita_id}", f"recordatorio_1h_{cita_id}"]
    ).eq("estado", "pendiente").execute()

    logger.info("Cita %s cancelada", cita_id)

    await audit(
        clinic_id=cita["clinic_id"],
        actor="ia",
        accion=CITA_CANCELAR,
        entidad="citas",
        entidad_id=cita_id,
        datos_antes={"estado": cita.get("estado"), "fecha_inicio": cita.get("fecha_inicio")},
        datos_despues={"estado": "cancelada"},
    )

    return {"cita_id": cita_id, "estado": "cancelada"}
