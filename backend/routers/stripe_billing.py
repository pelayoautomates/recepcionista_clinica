"""
Endpoints de billing con Stripe.
  POST /billing/checkout  → crea Checkout Session, devuelve URL
  POST /billing/portal    → crea Customer Portal session, devuelve URL
  POST /billing/webhook   → maneja eventos de Stripe (suscripciones, pagos)
"""
import logging

import stripe
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

from billing import MINUTOS_POR_PLAN
from config import settings
from database.client import get_supabase

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
async def create_checkout(body: CheckoutRequest):
    """Crea una Stripe Checkout Session y devuelve la URL de pago."""
    s = _stripe()
    price_fn = PLAN_PRICE_MAP.get(body.plan)
    if not price_fn:
        raise HTTPException(status_code=400, detail=f"Plan desconocido: {body.plan}")
    price_id = price_fn()
    if not price_id:
        raise HTTPException(status_code=503, detail=f"Precio Stripe no configurado para {body.plan}")

    db = get_supabase()
    clinica = db.table("clinicas").select("nombre, stripe_customer_id, plan").eq("id", body.clinic_id).single().execute().data

    customer_id = clinica.get("stripe_customer_id") or None

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

    session = s.checkout.Session.create(**session_params)
    return {"url": session.url}


@router.post("/portal")
async def create_portal(body: PortalRequest):
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

    etype = event["type"]
    data = event["data"]["object"]
    logger.info("Stripe webhook: %s", etype)

    if etype == "checkout.session.completed":
        _handle_checkout_completed(data)

    elif etype in ("customer.subscription.updated", "customer.subscription.created"):
        _handle_subscription_updated(data)

    elif etype == "customer.subscription.deleted":
        _handle_subscription_deleted(data)

    elif etype == "invoice.payment_failed":
        _handle_payment_failed(data)

    return {"received": True}


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
