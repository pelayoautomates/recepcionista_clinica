"""
Endpoints de billing con Stripe.
  POST /billing/checkout  → crea Checkout Session, devuelve URL
  POST /billing/portal    → crea Customer Portal session, devuelve URL
  POST /billing/webhook   → maneja eventos de Stripe (suscripciones, pagos)
"""
import logging
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel

from billing import MINUTOS_POR_PLAN
from config import settings
from database.client import get_supabase
from security import require_admin_key
from webhook_dedupe import mark_webhook_event_once

logger = logging.getLogger(__name__)
router = APIRouter()

PLAN_PRICE_MAP = {
    "starter": lambda: settings.stripe_price_starter,
    "pro":     lambda: settings.stripe_price_pro,
    "growth":  lambda: settings.stripe_price_growth,
}

PRICE_PLAN_MAP: dict[str, str] = {}   # price_id → plan_slug (populated lazily)


def _stripe():
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe no configurado")
    stripe.api_key = settings.stripe_secret_key
    return stripe


class CheckoutRequest(BaseModel):
    clinic_id: str
    plan: str          # "starter" | "pro" | "growth"
    email: str | None = None


class PortalRequest(BaseModel):
    clinic_id: str


@router.post("/checkout")
async def create_checkout(body: CheckoutRequest, _: None = Depends(require_admin_key)):
    """Crea una Stripe Checkout Session y devuelve la URL de pago."""
    s = _stripe()
    price_fn = PLAN_PRICE_MAP.get(body.plan)
    if not price_fn:
        raise HTTPException(status_code=400, detail=f"Plan desconocido: {body.plan}")
    price_id = price_fn()
    if not price_id:
        raise HTTPException(status_code=503, detail=f"Precio Stripe no configurado para {body.plan}")

    db = get_supabase()
    clinica = db.table("clinicas").select(
        "nombre, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, plan"
    ).eq("id", body.clinic_id).single().execute().data

    customer_id = clinica.get("stripe_customer_id") or None

    # Un upgrade no debe crear una segunda suscripción para el mismo cliente.
    subscription_id = clinica.get("stripe_subscription_id")
    if subscription_id and clinica.get("stripe_subscription_status") in ("active", "trialing"):
        subscription = s.Subscription.retrieve(subscription_id)
        items = subscription.get("items", {}).get("data", [])
        if not items:
            raise HTTPException(status_code=502, detail="La suscripción no tiene una línea actualizable")
        s.Subscription.modify(
            subscription_id,
            items=[{"id": items[0]["id"], "price": price_id}],
            proration_behavior="create_prorations",
            metadata={"clinic_id": body.clinic_id, "plan": body.plan},
            idempotency_key=f"upgrade:{body.clinic_id}:{body.plan}:{datetime.now(timezone.utc):%Y%m%d%H}",
        )
        db.table("clinicas").update({
            "plan": body.plan,
            "minutos_incluidos": MINUTOS_POR_PLAN.get(body.plan, 300),
        }).eq("id", body.clinic_id).execute()
        return {
            "url": f"{settings.dashboard_url}/panel/facturacion?billing=updated&plan={body.plan}",
            "updated": True,
        }

    # Crear o reusar customer
    if not customer_id and body.email:
        customer = s.Customer.create(
            email=body.email,
            metadata={"clinic_id": body.clinic_id},
        )
        customer_id = customer.id
        db.table("clinicas").update({"stripe_customer_id": customer_id}).eq("id", body.clinic_id).execute()

    session_params = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": f"{settings.dashboard_url}/panel?billing=success&plan={body.plan}",
        "cancel_url": f"{settings.dashboard_url}/suscripcion?billing=cancelled",
        "metadata": {"clinic_id": body.clinic_id, "plan": body.plan},
        "subscription_data": {"metadata": {"clinic_id": body.clinic_id, "plan": body.plan}},
        "allow_promotion_codes": True,
    }
    if customer_id:
        session_params["customer"] = customer_id
    elif body.email:
        session_params["customer_email"] = body.email

    session = s.checkout.Session.create(
        **session_params,
        idempotency_key=f"checkout:{body.clinic_id}:{body.plan}:{datetime.now(timezone.utc):%Y%m%d%H}",
    )
    return {"url": session.url}


@router.post("/portal")
async def create_portal(body: PortalRequest, _: None = Depends(require_admin_key)):
    """Crea una Stripe Customer Portal session para gestionar suscripción."""
    s = _stripe()
    db = get_supabase()
    clinica = db.table("clinicas").select("stripe_customer_id").eq("id", body.clinic_id).single().execute().data
    customer_id = clinica.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=404, detail="Clínica sin customer de Stripe")

    session = s.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{settings.dashboard_url}/panel/facturacion",
    )
    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
):
    """Maneja eventos de Stripe: suscripciones, pagos, cancelaciones."""
    s = _stripe()
    payload = await request.body()

    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook secret no configurado")

    try:
        event = s.Webhook.construct_event(payload, stripe_signature, settings.stripe_webhook_secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Firma de webhook inválida")

    event_id = event.get("id")
    if event_id and not mark_webhook_event_once("stripe", event_id, payload.decode("utf-8", errors="replace")):
        return {"received": True, "duplicate": True}

    etype = event["type"]
    data = event["data"]["object"]
    logger.info("Stripe webhook: %s", etype)
    try:
        if etype == "checkout.session.completed":
            _handle_checkout_completed(data)
        elif etype in ("customer.subscription.updated", "customer.subscription.created"):
            _handle_subscription_updated(data)
        elif etype == "customer.subscription.deleted":
            _handle_subscription_deleted(data)
        elif etype == "invoice.paid":
            _handle_invoice_paid(data)
        elif etype == "invoice.payment_failed":
            _handle_payment_failed(data)
    except Exception:
        # Permite que Stripe reintente si el procesamiento falló después de reclamar el evento.
        if event_id:
            try:
                get_supabase().table("webhook_events").delete().eq("provider", "stripe").eq("event_key", event_id).execute()
            except Exception:
                logger.exception("No se pudo liberar el evento Stripe fallido %s", event_id)
        raise

    return {"received": True}


def _handle_invoice_paid(invoice: dict):
    """Renovación mensual cobrada → resetear el contador de minutos del mes."""
    customer_id = invoice.get("customer")
    if not customer_id:
        return
    db = get_supabase()
    row = db.table("clinicas").select("id").eq("stripe_customer_id", customer_id).limit(1).execute()
    if not row.data:
        logger.warning("invoice.paid de customer %s sin clínica asociada", customer_id)
        return
    db.table("clinicas").update({
        "minutos_usados_mes": 0,
        "billing_period_start": datetime.now(timezone.utc).isoformat(),
        "stripe_subscription_status": "active",
    }).eq("id", row.data[0]["id"]).execute()
    logger.info("Minutos reiniciados por renovación de customer %s", customer_id)


def _handle_checkout_completed(session: dict):
    clinic_id = session.get("metadata", {}).get("clinic_id")
    plan = session.get("metadata", {}).get("plan")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    if not clinic_id or not plan:
        logger.warning("checkout.session.completed sin clinic_id/plan en metadata")
        return

    db = get_supabase()
    update: dict = {
        "plan": plan,
        "minutos_incluidos": MINUTOS_POR_PLAN.get(plan, 300),
        "minutos_usados_mes": 0,
    }
    if customer_id:
        update["stripe_customer_id"] = customer_id
    if subscription_id:
        update["stripe_subscription_id"] = subscription_id
        update["stripe_subscription_status"] = "active"
    db.table("clinicas").update(update).eq("id", clinic_id).execute()
    logger.info("Clínica %s activada en plan %s", clinic_id, plan)


def _handle_subscription_updated(sub: dict):
    customer_id = sub.get("customer")
    status = sub.get("status")
    sub_id = sub.get("id")
    plan = sub.get("metadata", {}).get("plan")
    if not customer_id:
        return

    db = get_supabase()
    update: dict = {
        "stripe_subscription_id": sub_id,
        "stripe_subscription_status": status,
    }
    if plan:
        update["plan"] = plan
        update["minutos_incluidos"] = MINUTOS_POR_PLAN.get(plan, 300)

    rows = db.table("clinicas").update(update).eq("stripe_customer_id", customer_id).execute()
    logger.info("Suscripción actualizada para customer %s → %s", customer_id, status)


def _handle_subscription_deleted(sub: dict):
    customer_id = sub.get("customer")
    if not customer_id:
        return
    db = get_supabase()
    db.table("clinicas").update({
        "plan": "cancelado",
        "stripe_subscription_status": "canceled",
    }).eq("stripe_customer_id", customer_id).execute()
    logger.info("Suscripción cancelada para customer %s", customer_id)


def _handle_payment_failed(invoice: dict):
    customer_id = invoice.get("customer")
    if not customer_id:
        return
    db = get_supabase()
    db.table("clinicas").update({
        "stripe_subscription_status": "past_due",
    }).eq("stripe_customer_id", customer_id).execute()
    logger.warning("Pago fallido para customer %s", customer_id)
