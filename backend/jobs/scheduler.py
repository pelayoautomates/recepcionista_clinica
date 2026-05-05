import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(timezone="UTC")


def start_scheduler():
    _scheduler.add_job(
        _procesar_jobs_pendientes,
        trigger=IntervalTrigger(minutes=1),
        id="procesar_jobs",
        replace_existing=True,
    )
    _scheduler.add_job(
        _programar_recordatorios_pendientes,
        trigger=IntervalTrigger(hours=1),
        id="programar_recordatorios",
        replace_existing=True,
    )
    _scheduler.start()


def stop_scheduler():
    _scheduler.shutdown(wait=False)


def _procesar_jobs_pendientes():
    """Ejecuta todos los jobs pendientes cuya fecha_programada ya pasó."""
    from database.client import get_supabase
    db = get_supabase()
    ahora = datetime.now(timezone.utc)

    result = db.table("jobs") \
        .select("*") \
        .eq("estado", "pendiente") \
        .lte("fecha_programada", ahora.isoformat()) \
        .execute()

    for job in result.data:
        _ejecutar_job(job)


def _ejecutar_job(job: dict):
    from database.client import get_supabase
    db = get_supabase()
    job_id = job["id"]

    # Marcar como ejecutando (evita doble ejecución)
    db.table("jobs").update({"estado": "ejecutando"}).eq("id", job_id).execute()

    try:
        tipo = job["tipo"]
        if tipo == "recordatorio_24h":
            _enviar_recordatorio_whatsapp(job, "24h")
        elif tipo == "recordatorio_1h":
            _enviar_recordatorio_whatsapp(job, "1h")
        elif tipo == "seguimiento_lead":
            _enviar_seguimiento_lead(job)
        elif tipo == "resumen_diario":
            _enviar_resumen_diario(job)

        db.table("jobs").update({"estado": "ejecutado"}).eq("id", job_id).execute()
        logger.info("Job %s (%s) ejecutado correctamente", job_id, tipo)

    except Exception as e:
        intentos = job.get("intentos", 0) + 1
        nuevo_estado = "fallido" if intentos >= 3 else "pendiente"
        # Backoff: reintentar en 5, 15 minutos
        nueva_fecha = datetime.now(timezone.utc) + timedelta(minutes=5 * intentos)

        db.table("jobs").update({
            "estado": nuevo_estado,
            "intentos": intentos,
            "error": str(e),
            "fecha_programada": nueva_fecha.isoformat() if nuevo_estado == "pendiente" else job["fecha_programada"],
        }).eq("id", job_id).execute()

        logger.error("Job %s (%s) falló (intento %d): %s", job_id, job["tipo"], intentos, e)


def _enviar_recordatorio_whatsapp(job: dict, tipo: str):
    """Envía plantilla de recordatorio por WhatsApp."""
    import httpx
    from config import settings
    from database.client import get_supabase

    db = get_supabase()
    paciente_id = job.get("paciente_id")
    if not paciente_id:
        return

    paciente = db.table("pacientes").select("nombre, telefono").eq("id", paciente_id).single().execute()
    telefono = paciente.data.get("telefono")
    nombre = paciente.data.get("nombre", "Paciente")
    if not telefono:
        return

    payload = job.get("payload", {})
    fecha_cita = payload.get("fecha_cita", "")
    nombre_clinica = payload.get("nombre_clinica", "la clínica")

    if tipo == "24h":
        texto = f"Hola {nombre}, te recordamos que tienes una cita mañana en {nombre_clinica}: {fecha_cita}. Responde CONFIRMAR, CANCELAR o MOVER si necesitas cambiarla."
    else:
        texto = f"Hola {nombre}, tu cita en {nombre_clinica} es en aproximadamente 1 hora: {fecha_cita}. ¡Te esperamos!"

    import httpx as _httpx
    with _httpx.Client() as client:
        client.post(
            f"https://graph.facebook.com/v21.0/{settings.meta_phone_number_id}/messages",
            json={
                "messaging_product": "whatsapp",
                "to": telefono,
                "type": "text",
                "text": {"body": texto},
            },
            headers={
                "Authorization": f"Bearer {settings.meta_access_token}",
                "Content-Type": "application/json",
            },
        )


def _enviar_seguimiento_lead(job: dict):
    """Envía mensaje de seguimiento a un lead frío."""
    import httpx
    from config import settings
    from database.client import get_supabase

    db = get_supabase()
    paciente_id = job.get("paciente_id")
    if not paciente_id:
        return

    paciente = db.table("pacientes").select("nombre, telefono, estado_lead").eq("id", paciente_id).single().execute()
    telefono = paciente.data.get("telefono")
    nombre = paciente.data.get("nombre", "")
    estado = paciente.data.get("estado_lead")

    if not telefono or estado in ("cita_agendada", "completado"):
        return

    texto = f"Hola{f' {nombre}' if nombre else ''}, ¿pudiste agendar tu cita? Estamos aquí para ayudarte cuando lo necesites."

    with httpx.Client() as client:
        client.post(
            f"https://graph.facebook.com/v21.0/{settings.meta_phone_number_id}/messages",
            json={
                "messaging_product": "whatsapp",
                "to": telefono,
                "type": "text",
                "text": {"body": texto},
            },
            headers={
                "Authorization": f"Bearer {settings.meta_access_token}",
                "Content-Type": "application/json",
            },
        )


def _enviar_resumen_diario(job: dict):
    """Genera y envía el resumen diario a la clínica."""
    from database.client import get_supabase
    from openai import OpenAI
    from config import settings

    db = get_supabase()
    clinic_id = job["clinic_id"]
    hoy = datetime.now(timezone.utc).date().isoformat()

    citas = db.table("citas").select("tipo_servicio, fecha_inicio, estado") \
        .eq("clinic_id", clinic_id) \
        .gte("fecha_inicio", f"{hoy}T00:00:00Z") \
        .lte("fecha_inicio", f"{hoy}T23:59:59Z") \
        .execute().data

    leads_nuevos = db.table("pacientes").select("nombre, canal_origen, estado_lead") \
        .eq("clinic_id", clinic_id) \
        .gte("created_at", f"{hoy}T00:00:00Z") \
        .execute().data

    pendientes_humano = db.table("conversaciones").select("id") \
        .eq("clinic_id", clinic_id) \
        .eq("estado", "esperando_humano") \
        .execute().data

    resumen_datos = {
        "citas_hoy": len(citas),
        "leads_nuevos": len(leads_nuevos),
        "conversaciones_pendientes": len(pendientes_humano),
        "detalle_citas": citas[:10],
    }

    openai = OpenAI(api_key=settings.openai_api_key)
    respuesta = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Eres un asistente que genera resúmenes diarios concisos para clínicas dentales."},
            {"role": "user", "content": f"Genera un resumen diario breve en español basado en estos datos: {resumen_datos}"}
        ]
    )
    resumen_texto = respuesta.choices[0].message.content

    # TODO: Enviar por email o Telegram a la clínica
    logger.info("Resumen diario clínica %s:\n%s", clinic_id, resumen_texto)


def _programar_recordatorios_pendientes():
    """
    Busca citas en las próximas 25h sin recordatorio programado y los crea.
    Corre cada hora.
    """
    from database.client import get_supabase
    from datetime import datetime, timedelta, timezone

    db = get_supabase()
    ahora = datetime.now(timezone.utc)
    limite = ahora + timedelta(hours=25)

    citas = db.table("citas") \
        .select("id, clinic_id, paciente_id, fecha_inicio") \
        .eq("estado", "confirmada") \
        .gte("fecha_inicio", ahora.isoformat()) \
        .lte("fecha_inicio", limite.isoformat()) \
        .execute().data

    clinicas_cache = {}
    for cita in citas:
        clinic_id = cita["clinic_id"]
        if clinic_id not in clinicas_cache:
            c = db.table("clinicas").select("nombre").eq("id", clinic_id).single().execute()
            clinicas_cache[clinic_id] = c.data.get("nombre", "la clínica")
        nombre_clinica = clinicas_cache[clinic_id]

        fecha_cita = datetime.fromisoformat(cita["fecha_inicio"])
        fecha_24h = fecha_cita - timedelta(hours=24)
        fecha_1h = fecha_cita - timedelta(hours=1)

        payload = {
            "cita_id": cita["id"],
            "fecha_cita": fecha_cita.strftime("%d/%m/%Y %H:%M"),
            "nombre_clinica": nombre_clinica,
        }

        for tipo, fecha_prog in [("recordatorio_24h", fecha_24h), ("recordatorio_1h", fecha_1h)]:
            if fecha_prog > ahora:
                idem_key = f"{tipo}_{cita['id']}"
                db.table("jobs").upsert({
                    "clinic_id": clinic_id,
                    "paciente_id": cita["paciente_id"],
                    "tipo": tipo,
                    "fecha_programada": fecha_prog.isoformat(),
                    "estado": "pendiente",
                    "idempotency_key": idem_key,
                    "payload": payload,
                }, on_conflict="idempotency_key").execute()
