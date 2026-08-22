import logging
import os
import socket
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_TZ = ZoneInfo("Europe/Madrid")
_scheduler = BackgroundScheduler(timezone="Europe/Madrid")

# Identidad de esta réplica, para el leader lock de las tareas de barrido.
_INSTANCE_ID = f"{socket.gethostname()}:{os.getpid()}:{uuid.uuid4().hex[:8]}"


class JobOmitido(Exception):
    """
    El job no tenía nada que hacer: no es un éxito ni un fallo.

    En producción había 8 recordatorios marcados como `ejecutado` que no habían
    enviado nada, porque la cita no tenía paciente asociado y el handler hacía
    `return` en silencio. El panel decía "8 recordatorios enviados" y el paciente
    no había recibido ninguno. Ahora quedan como `cancelado` con el motivo.
    """


def _tomar_lock(nombre: str, ttl_segundos: int) -> bool:
    """
    Intenta hacerse con el lock de una tarea de barrido.

    APScheduler arranca dentro de cada réplica del backend. Los jobs de la tabla
    `jobs` tienen claim atómico propio, pero el sync de Google Calendar y el
    reset de períodos no lo tienen y se ejecutaban una vez por réplica. Si la
    función RPC todavía no está desplegada se falla en abierto: es preferible
    duplicar trabajo idempotente a dejar de hacerlo.
    """
    from database.client import get_supabase

    try:
        res = get_supabase().rpc(
            "try_acquire_scheduler_lock",
            {"p_name": nombre, "p_holder": _INSTANCE_ID, "p_ttl_seconds": ttl_segundos},
        ).execute()
    except Exception as exc:
        logger.warning("Leader lock '%s' no disponible (%s); se ejecuta sin lock", nombre, exc)
        return True

    adquirido = bool(res.data)
    if not adquirido:
        logger.debug("Leader lock '%s' en manos de otra réplica", nombre)
    return adquirido


def start_scheduler():
    if _scheduler.running:
        logger.info("Scheduler ya estaba iniciado")
        return

    _scheduler.add_job(
        _procesar_jobs_pendientes,
        trigger=IntervalTrigger(minutes=1),
        id="procesar_jobs",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=30,
    )
    _scheduler.add_job(
        _programar_recordatorios_pendientes,
        trigger=IntervalTrigger(hours=1),
        id="programar_recordatorios",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=300,
    )
    _scheduler.add_job(
        _sync_all_gcal,
        trigger=IntervalTrigger(minutes=60),
        id="sync_gcal",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=300,
    )
    _scheduler.add_job(
        _reset_periodos_facturacion,
        trigger=IntervalTrigger(hours=6),
        id="reset_periodos",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=3600,
    )
    _scheduler.start()
    logger.info(
        "Scheduler iniciado: procesar_jobs (1min), programar_recordatorios (1h), "
        "sync_gcal (60min), reset_periodos (6h)"
    )


def stop_scheduler():
    if not _scheduler.running:
        return
    _scheduler.shutdown(wait=False)
    logger.info("Scheduler detenido")


def scheduler_status() -> dict:
    """Estado del scheduler para el endpoint /health."""
    jobs = []
    for job in _scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
        })
    return {
        "running": _scheduler.running,
        "jobs": jobs,
    }


def _procesar_jobs_pendientes():
    """Ejecuta todos los jobs pendientes cuya fecha_programada ya pasó."""
    from database.client import get_supabase
    db = get_supabase()
    ahora = datetime.now(timezone.utc)

    result = db.table("jobs") \
        .select("*") \
        .eq("estado", "pendiente") \
        .lte("fecha_programada", ahora.isoformat()) \
        .order("fecha_programada") \
        .limit(200) \
        .execute()

    for job in result.data:
        _ejecutar_job(job)


def _ejecutar_job(job: dict):
    from database.client import get_supabase
    db = get_supabase()
    job_id = job["id"]

    # Claim atomico: evita doble ejecucion cuando hay mas de una instancia del scheduler.
    claim = db.table("jobs").update({"estado": "ejecutando"}) \
        .eq("id", job_id) \
        .eq("estado", "pendiente") \
        .execute()
    if not claim.data:
        return

    try:
        tipo = job["tipo"]
        if tipo == "recordatorio_24h":
            _enviar_recordatorio_sms(job, "24h")
        elif tipo == "recordatorio_1h":
            _enviar_recordatorio_sms(job, "1h")
        elif tipo == "seguimiento_lead":
            from config import settings
            if not settings.marketing_sms_enabled:
                raise RuntimeError("Seguimientos comerciales desactivados")
            _enviar_seguimiento_lead(job)
        elif tipo == "escalada_humano":
            _reintentar_escalada(job)

        db.table("jobs").update({"estado": "ejecutado"}).eq("id", job_id).eq("estado", "ejecutando").execute()
        logger.info("Job %s (%s) ejecutado OK", job_id, tipo)

    except JobOmitido as omitido:
        # Nada que enviar: ni se reintenta ni se cuenta como entregado.
        db.table("jobs").update({
            "estado": "cancelado",
            "error": f"omitido: {omitido}",
        }).eq("id", job_id).eq("estado", "ejecutando").execute()
        logger.info("Job %s (%s) omitido: %s", job_id, job["tipo"], omitido)

    except Exception as e:
        intentos = job.get("intentos", 0) + 1
        nuevo_estado = "fallido" if intentos >= 3 else "pendiente"
        nueva_fecha = datetime.now(timezone.utc) + timedelta(minutes=5 * intentos)

        db.table("jobs").update({
            "estado": nuevo_estado,
            "intentos": intentos,
            "error": str(e),
            "fecha_programada": nueva_fecha.isoformat() if nuevo_estado == "pendiente" else job["fecha_programada"],
        }).eq("id", job_id).eq("estado", "ejecutando").execute()

        logger.error("Job %s (%s) falló (intento %d): %s", job_id, job["tipo"], intentos, e)


def _credenciales_whatsapp(clinic_id: str | None) -> tuple[str, str] | None:
    """(phone_number_id, access_token) de la clínica, si tiene WhatsApp conectado."""
    if not clinic_id:
        return None
    from database.client import get_supabase

    try:
        row = get_supabase().table("clinicas").select(
            "meta_phone_number_id, meta_access_token"
        ).eq("id", clinic_id).single().execute().data or {}
        phone_id = row.get("meta_phone_number_id")
        token_enc = row.get("meta_access_token")
        if not phone_id or not token_enc:
            return None
        from cryptography.fernet import Fernet
        from config import settings
        token = Fernet(settings.fernet_key.encode()).decrypt(token_enc.encode()).decode()
        return phone_id, token
    except Exception as exc:
        logger.warning("No se pudieron leer credenciales WhatsApp de %s: %s", clinic_id, exc)
        return None


def _enviar_recordatorio_sms(job: dict, tipo: str):
    """
    Envía el recordatorio de cita. Intenta SMS (Telnyx) y, si no está configurado
    o el proveedor no confirma, cae a WhatsApp con las credenciales de la clínica.

    Sin este fallback las clínicas que solo tienen WhatsApp conectado no enviaban
    ningún recordatorio: el job fallaba tres veces y quedaba en 'fallido' sin que
    el paciente recibiera nada.
    """
    import asyncio

    import telnyx_sms as sms
    import whatsapp as wa
    from database.client import get_supabase

    db = get_supabase()
    paciente_id = job.get("paciente_id")
    if not paciente_id:
        raise JobOmitido("la cita no tiene paciente asociado")

    paciente = db.table("pacientes").select("nombre, telefono").eq("id", paciente_id).single().execute()
    telefono = (paciente.data or {}).get("telefono")
    nombre = (paciente.data or {}).get("nombre", "Paciente")
    if not telefono:
        raise JobOmitido("el paciente no tiene teléfono")

    payload = job.get("payload", {})
    nombre_clinica = payload.get("nombre_clinica", "la clínica")
    servicio = payload.get("tipo_servicio", "")
    fecha_texto = payload.get("fecha_cita", "")

    sent = sms.recordatorio_cita(
        to=telefono,
        nombre_paciente=nombre,
        nombre_clinica=nombre_clinica,
        servicio=servicio,
        fecha_texto=fecha_texto,
        tipo=tipo,
    )

    if not sent:
        credenciales = _credenciales_whatsapp(job.get("clinic_id"))
        if credenciales:
            phone_id, token = credenciales
            sent = asyncio.run(
                wa.recordatorio_cita(
                    to=telefono,
                    nombre_paciente=nombre,
                    nombre_clinica=nombre_clinica,
                    servicio=servicio,
                    fecha_texto=fecha_texto,
                    tipo=tipo,
                    clinic_whatsapp_number=phone_id,
                    access_token=token,
                )
            )
            if sent:
                logger.info("Recordatorio %s entregado por WhatsApp (SMS no disponible)", tipo)

    if not sent:
        raise RuntimeError("Ningún canal confirmó la entrega del recordatorio")


def _enviar_seguimiento_lead(job: dict):
    import telnyx_sms as sms
    from database.client import get_supabase

    db = get_supabase()
    paciente_id = job.get("paciente_id")
    if not paciente_id:
        raise JobOmitido("el seguimiento no tiene paciente asociado")

    paciente = db.table("pacientes").select(
        "nombre, telefono, estado_lead, sms_marketing_consent_at, sms_opted_out_at"
    ).eq("id", paciente_id).eq("clinic_id", job.get("clinic_id")).single().execute()
    datos = paciente.data or {}
    telefono = datos.get("telefono")
    nombre = datos.get("nombre", "")
    estado = datos.get("estado_lead")

    if not telefono:
        raise JobOmitido("el paciente no tiene teléfono")
    if estado in ("cita_agendada", "completado"):
        raise JobOmitido(f"el lead ya está en estado {estado}")
    if not datos.get("sms_marketing_consent_at"):
        raise JobOmitido("sin consentimiento de SMS comercial")
    if datos.get("sms_opted_out_at"):
        raise JobOmitido("el paciente se dio de baja")

    clinic_id = job.get("clinic_id")
    clinica = db.table("clinicas").select("nombre").eq("id", clinic_id).single().execute() if clinic_id else None
    nombre_clinica = (clinica.data or {}).get("nombre", "la clínica") if clinica else "la clínica"

    sent = sms.seguimiento_lead(
        to=telefono,
        nombre_paciente=nombre,
        nombre_clinica=nombre_clinica,
    )
    if not sent:
        raise RuntimeError("El proveedor SMS no confirmó el seguimiento")



def _reintentar_escalada(job: dict):
    """
    Reintenta la entrega de una escalada a humano que no salió a la primera.

    El registro en el panel ya existe desde el primer intento; esto solo persigue
    la notificación. Si ningún destinatario confirma se lanza excepción para que
    el job vuelva con el backoff normal (3 intentos) y quede visible como
    'fallido' en /admin/clinicas/{id}/jobs.
    """
    import asyncio

    from tools.sistema import entregar_aviso_escalada

    payload = job.get("payload") or {}
    entregado, _ = asyncio.run(
        entregar_aviso_escalada(
            clinic_id=job.get("clinic_id"),
            paciente_id=job.get("paciente_id"),
            conversacion_id=payload.get("conversacion_id"),
            motivo=payload.get("motivo", ""),
            resumen=payload.get("resumen", ""),
        )
    )
    if not entregado:
        raise RuntimeError("Ningún destinatario confirmó la escalada")


def _programar_recordatorios_pendientes():
    """Busca citas en próximas 25h sin recordatorio y los crea. Corre cada hora."""
    if not _tomar_lock("programar_recordatorios", 55 * 60):
        return

    from database.client import get_supabase

    db = get_supabase()
    ahora = datetime.now(timezone.utc)
    limite = ahora + timedelta(hours=25)

    citas = db.table("citas") \
        .select("id, clinic_id, paciente_id, fecha_inicio, tipo_servicio") \
        .eq("estado", "confirmada") \
        .gte("fecha_inicio", ahora.isoformat()) \
        .lte("fecha_inicio", limite.isoformat()) \
        .execute().data

    clinicas_cache: dict[str, str] = {}
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
            "tipo_servicio": cita.get("tipo_servicio", ""),
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


def _reset_periodos_facturacion():
    """
    Red de seguridad del contador de minutos: si una clínica lleva más de 31 días
    sin reiniciar su período, se reinicia aquí.

    El camino normal es el webhook `invoice.paid` de Stripe. Este job cubre los dos
    huecos: clínicas en trial (sin Stripe) y webhooks que no llegaron.
    """
    if not _tomar_lock("reset_periodos", 5 * 3600):
        return

    from database.client import get_supabase

    db = get_supabase()
    ahora = datetime.now(timezone.utc)
    limite = (ahora - timedelta(days=31)).isoformat()

    # billing_period_start nulo = nunca inicializado; se abre el período ahora.
    sin_periodo = db.table("clinicas").select("id") \
        .is_("billing_period_start", "null").limit(500).execute().data or []
    for c in sin_periodo:
        db.table("clinicas").update({"billing_period_start": ahora.isoformat()}) \
            .eq("id", c["id"]).execute()

    caducadas = db.table("clinicas").select("id, minutos_usados_mes") \
        .lt("billing_period_start", limite).limit(500).execute().data or []
    for c in caducadas:
        db.table("clinicas").update({
            "minutos_usados_mes": 0,
            "billing_period_start": ahora.isoformat(),
        }).eq("id", c["id"]).execute()
        logger.info("Período reiniciado (fallback) para clínica %s", c["id"])


def _sync_all_gcal():
    """Importa eventos de GCal para todas las clínicas con GCal conectado. Corre cada 60 min."""
    if not _tomar_lock("sync_gcal", 55 * 60):
        return

    from database.client import get_supabase
    from routers.admin import _do_sync_gcal

    db = get_supabase()
    clinicas = db.table("clinicas").select("id").not_.is_("google_tokens_enc", "null").execute()

    for c in clinicas.data:
        clinic_id = c["id"]
        try:
            result = _do_sync_gcal(clinic_id)
            logger.info("GCal sync clínica %s: %s importadas, %s actualizadas", clinic_id, result["importados"], result["actualizados"])
        except Exception as e:
            logger.warning("GCal sync falló clínica %s: %s", clinic_id, e)
