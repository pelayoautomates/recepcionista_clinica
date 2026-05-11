import logging
from datetime import datetime, timezone

from database.client import get_supabase

logger = logging.getLogger(__name__)


async def programar_seguimiento(paciente_id: str, fecha_iso: str, motivo: str) -> dict:
    """
    Programa un job de seguimiento para un paciente.
    fecha_iso: ISO 8601 de cuándo ejecutar el seguimiento
    """
    db = get_supabase()

    # Obtener clinic_id del paciente
    paciente = db.table("pacientes").select("clinic_id").eq("id", paciente_id).single().execute()
    clinic_id = paciente.data["clinic_id"]

    fecha = datetime.fromisoformat(fecha_iso)
    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=timezone.utc)

    idempotency_key = f"seguimiento_lead_{paciente_id}_{fecha.date()}"

    job_data = {
        "clinic_id": clinic_id,
        "paciente_id": paciente_id,
        "tipo": "seguimiento_lead",
        "fecha_programada": fecha.isoformat(),
        "estado": "pendiente",
        "idempotency_key": idempotency_key,
        "payload": {"motivo": motivo},
    }

    # ON CONFLICT DO NOTHING via upsert
    result = db.table("jobs").upsert(job_data, on_conflict="idempotency_key").execute()
    logger.info("Seguimiento programado para paciente %s el %s", paciente_id, fecha.date())
    return {"job_id": result.data[0]["id"], "fecha_programada": fecha.isoformat()}


async def agregar_a_lista_espera(
    paciente_id: str,
    servicio_nombre: str,
    notas: str = "",
) -> dict:
    """Añade al paciente a la lista de espera cuando no hay disponibilidad."""
    db = get_supabase()
    paciente = db.table("pacientes").select("clinic_id").eq("id", paciente_id).single().execute()
    if not paciente.data:
        return {"ok": False, "error": "paciente_no_encontrado"}
    clinic_id = paciente.data["clinic_id"]
    result = db.table("lista_espera").insert({
        "clinic_id": clinic_id,
        "paciente_id": paciente_id,
        "servicio_nombre": servicio_nombre,
        "notas": notas or None,
        "estado": "esperando",
    }).execute()
    logger.info("Paciente %s añadido a lista de espera para %s", paciente_id, servicio_nombre)
    return {"ok": True, "entrada_id": result.data[0]["id"]}


async def escalar_a_humano(paciente_id: str, motivo: str, resumen: str) -> dict:
    """
    Escala la conversación activa a un humano:
    1. Cambia estado de la conversación a 'esperando_humano'
    2. Cambia estado del lead a 'requiere_humano'
    3. (Placeholder) Notificación a la clínica
    """
    db = get_supabase()

    # Buscar conversación activa del paciente
    conv_result = db.table("conversaciones") \
        .select("id, clinic_id") \
        .eq("paciente_id", paciente_id) \
        .eq("estado", "activa") \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    if conv_result.data:
        conv_id = conv_result.data[0]["id"]
        clinic_id = conv_result.data[0]["clinic_id"]
        db.table("conversaciones").update({
            "estado": "esperando_humano",
        }).eq("id", conv_id).execute()
    else:
        conv_id = None
        clinic_id = None

    db.table("pacientes").update({"estado_lead": "requiere_humano"}).eq("id", paciente_id).execute()

    logger.warning(
        "HANDOFF A HUMANO — Paciente %s | Clínica %s | Motivo: %s",
        paciente_id, clinic_id, motivo
    )

    # Notificación por webhook configurable (Slack, Make, n8n, etc.)
    from config import settings
    if settings.notify_webhook_url:
        try:
            import httpx
            payload = {
                "tipo": "escalada_humano",
                "clinic_id": clinic_id,
                "paciente_id": paciente_id,
                "conversacion_id": conv_id,
                "motivo": motivo,
                "resumen": resumen,
            }
            httpx.post(settings.notify_webhook_url, json=payload, timeout=5)
        except Exception as e:
            logger.error("Error enviando notificación de escalada: %s", e)

    return {
        "estado": "esperando_humano",
        "conversacion_id": conv_id,
        "motivo": motivo,
        "resumen": resumen,
    }
