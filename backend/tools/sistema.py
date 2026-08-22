import logging
from datetime import datetime, timedelta, timezone

from database.client import get_supabase

logger = logging.getLogger(__name__)


async def programar_seguimiento(clinic_id: str, paciente_id: str, fecha_iso: str, motivo: str) -> dict:
    """
    Programa un job de seguimiento para un paciente.
    fecha_iso: ISO 8601 de cuándo ejecutar el seguimiento
    """
    from config import settings
    if not settings.marketing_sms_enabled:
        return {"ok": False, "error": "seguimiento_comercial_no_habilitado"}

    db = get_supabase()

    paciente = db.table("pacientes").select(
        "id, sms_marketing_consent_at, sms_opted_out_at"
    ).eq("id", paciente_id).eq("clinic_id", clinic_id).single().execute()
    if not paciente.data:
        return {"ok": False, "error": "paciente_no_encontrado"}
    if not paciente.data.get("sms_marketing_consent_at") or paciente.data.get("sms_opted_out_at"):
        return {"ok": False, "error": "sin_consentimiento_sms"}

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
    clinic_id: str,
    paciente_id: str,
    servicio_nombre: str,
    notas: str = "",
) -> dict:
    """Añade al paciente a la lista de espera cuando no hay disponibilidad."""
    db = get_supabase()
    paciente = db.table("pacientes").select("id").eq("id", paciente_id).eq("clinic_id", clinic_id).single().execute()
    if not paciente.data:
        return {"ok": False, "error": "paciente_no_encontrado"}
    result = db.table("lista_espera").insert({
        "clinic_id": clinic_id,
        "paciente_id": paciente_id,
        "servicio_nombre": servicio_nombre,
        "notas": notas or None,
        "estado": "esperando",
    }).execute()
    logger.info("Paciente %s añadido a lista de espera para %s", paciente_id, servicio_nombre)
    return {"ok": True, "entrada_id": result.data[0]["id"]}


async def entregar_aviso_escalada(
    clinic_id: str | None,
    paciente_id: str | None,
    conversacion_id: str | None,
    motivo: str,
    resumen: str,
) -> tuple[bool, list[str]]:
    """
    Envía el aviso de escalada a todos los destinatarios configurados.

    Son dos: el webhook propio de la clínica (`clinicas.notif_webhook`) y el
    webhook global de la agencia (`NOTIFY_WEBHOOK_URL`). Antes se usaba uno *o*
    el otro, así que durante un piloto la agencia no se enteraba de las escaladas
    de sus clientes. Ahora se intentan los dos y basta con que uno confirme.

    Devuelve (entregado_a_alguno, destinos_confirmados).
    """
    import httpx

    from config import settings
    from outbound import validate_public_http_url

    db = get_supabase()

    destinos: list[str] = []
    if clinic_id:
        try:
            row = db.table("clinicas").select("notif_webhook").eq("id", clinic_id).single().execute()
            propio = (row.data or {}).get("notif_webhook")
            if propio:
                destinos.append(propio)
        except Exception as exc:
            logger.warning("No se pudo leer notif_webhook de %s: %s", clinic_id, exc)

    global_url = (settings.notify_webhook_url or "").strip()
    if global_url and global_url not in destinos:
        destinos.append(global_url)

    if not destinos:
        logger.warning("ESCALADA SIN DESTINATARIO — clínica %s no tiene notif_webhook", clinic_id)
        return False, []

    payload = {
        "tipo": "escalada_humano",
        "clinic_id": clinic_id,
        "paciente_id": paciente_id,
        "conversacion_id": conversacion_id,
        "motivo": motivo,
        "resumen": resumen,
    }

    entregados: list[str] = []
    async with httpx.AsyncClient(timeout=5, follow_redirects=False) as client:
        for url in destinos:
            try:
                validate_public_http_url(url, https_only=settings.is_production)
                response = await client.post(url, json=payload)
                response.raise_for_status()
                entregados.append(url)
            except Exception as e:
                logger.error("Error enviando escalada a %s: %s", url, e)

    if entregados:
        logger.info("Escalada entregada a %d de %d destinos", len(entregados), len(destinos))
    return bool(entregados), entregados


def _encolar_reintento_escalada(
    clinic_id: str,
    paciente_id: str | None,
    conversacion_id: str | None,
    motivo: str,
    resumen: str,
) -> None:
    """
    Deja la escalada en la cola de jobs para que el scheduler la reintente.

    Sin esto, un webhook caído perdía el aviso para siempre: el único rastro era
    la conversación marcada en el panel, que nadie está mirando justo cuando
    hace falta.
    """
    db = get_supabase()
    ahora = datetime.now(timezone.utc)
    referencia = conversacion_id or paciente_id or ahora.strftime("%Y%m%d%H%M%S")

    try:
        db.table("jobs").upsert(
            {
                "clinic_id": clinic_id,
                "paciente_id": paciente_id,
                "tipo": "escalada_humano",
                "fecha_programada": (ahora + timedelta(minutes=2)).isoformat(),
                "estado": "pendiente",
                "idempotency_key": f"escalada_humano_{referencia}_{int(ahora.timestamp())}",
                "payload": {
                    "conversacion_id": conversacion_id,
                    "motivo": motivo,
                    "resumen": resumen,
                },
            },
            on_conflict="idempotency_key",
        ).execute()
        logger.info("Escalada encolada para reintento — clínica %s", clinic_id)
    except Exception as exc:
        logger.error("No se pudo encolar el reintento de escalada: %s", exc)


async def escalar_a_humano(clinic_id: str, paciente_id: str, motivo: str, resumen: str) -> dict:
    """
    Escala la conversación activa a un humano:
    1. Cambia estado de la conversación a 'esperando_humano'
    2. Cambia estado del lead a 'requiere_humano'
    3. Avisa a la clínica y a la agencia; si nadie confirma, deja el aviso en cola
    """
    db = get_supabase()

    # Buscar conversación activa del paciente
    conv_result = db.table("conversaciones") \
        .select("id, clinic_id") \
        .eq("paciente_id", paciente_id) \
        .eq("clinic_id", clinic_id) \
        .eq("estado", "activa") \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    if conv_result.data:
        conv_id = conv_result.data[0]["id"]
        db.table("conversaciones").update({
            "estado": "esperando_humano",
        }).eq("id", conv_id).eq("clinic_id", clinic_id).execute()
    else:
        conv_id = None
    db.table("pacientes").update({"estado_lead": "requiere_humano"}).eq("id", paciente_id).eq("clinic_id", clinic_id).execute()

    logger.warning(
        "HANDOFF A HUMANO — Paciente %s | Clínica %s | Motivo: %s",
        paciente_id, clinic_id, motivo
    )

    notification_delivered, destinos = await entregar_aviso_escalada(
        clinic_id=clinic_id,
        paciente_id=paciente_id,
        conversacion_id=conv_id,
        motivo=motivo,
        resumen=resumen,
    )

    reintento_encolado = False
    if not notification_delivered:
        _encolar_reintento_escalada(clinic_id, paciente_id, conv_id, motivo, resumen)
        reintento_encolado = True

    return {
        "estado": "esperando_humano",
        "registrado_en_panel": conv_id is not None,
        "notificacion_enviada": notification_delivered,
        "reintento_encolado": reintento_encolado,
        "destinos_notificados": len(destinos),
        "conversacion_id": conv_id,
        "motivo": motivo,
        "resumen": resumen,
    }
