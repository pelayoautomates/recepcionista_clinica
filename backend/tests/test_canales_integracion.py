"""
Tests de integración de los caminos de ENTRADA, canal por canal.

Motivo: el bug del dedupe de webhooks dejó el producto sin ningún canal entrante
—voz, WhatsApp y Stripe devolvían 200 sin procesar nada— y los 70 tests que
había entonces seguían en verde, porque ninguno recorría la petición completa.

Cada test entra por HTTP igual que lo hace el proveedor real: firma incluida,
cuerpo realista, y comprueba que el efecto de negocio ocurre de verdad.
"""
import hashlib
import hmac
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from config import settings

CLINIC_ID = "11111111-1111-1111-1111-111111111111"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "environment", "development")
    import main
    return TestClient(main.app)


@pytest.fixture(autouse=True)
def dedupe_en_memoria(monkeypatch):
    """
    Ejecuta el dedupe REAL contra una tabla `webhook_events` en memoria.

    Es deliberado no sustituir `mark_webhook_event_once`: si se mockea la
    función, el bug que rompió los tres canales vuelve a ser invisible. Aquí solo
    se sustituye Supabase, así que la lógica bajo prueba es la de producción.
    """
    import webhook_dedupe

    claims: set[tuple[str, str]] = set()

    class _Tabla:
        def __init__(self):
            self._insert = None
            self._delete = False
            self._filtros = {}

        def insert(self, row):
            self._insert = row
            return self

        def delete(self):
            self._delete = True
            return self

        def eq(self, columna, valor):
            self._filtros[columna] = valor
            return self

        def execute(self):
            if self._insert is not None:
                clave = (self._insert["provider"], self._insert["event_key"])
                if clave in claims:
                    raise RuntimeError("duplicate key value violates unique constraint")
                claims.add(clave)
            elif self._delete:
                claims.discard((self._filtros.get("provider"), self._filtros.get("event_key")))
            return self

    class _DB:
        def table(self, _nombre):
            return _Tabla()

    monkeypatch.setattr(webhook_dedupe, "get_supabase", lambda: _DB())
    return claims


# ── Voz: webhook de Retell ───────────────────────────────────────────────────

def _firmar_retell(cuerpo: str, api_key: str) -> str:
    ts = str(int(time.time() * 1000))
    digest = hmac.new(api_key.encode(), (cuerpo + ts).encode(), hashlib.sha256).hexdigest()
    return f"v={ts},d={digest}"


def _cuerpo_llamada(call_id="call_abc", duration_ms=125_000):
    return {
        "event": "call_ended",
        "call": {
            "call_id": call_id,
            "call_status": "ended",
            "duration_ms": duration_ms,
            "end_timestamp": 1_760_000_000_000,
            "metadata": {"clinic_id": CLINIC_ID},
            "transcript": "Agente: Hola. Paciente: Quiero cita.",
            "call_analysis": {"call_summary": "El paciente pide una cita."},
        },
    }


def test_llamada_terminada_factura_minutos_y_guarda_resumen(client, monkeypatch):
    monkeypatch.setattr(settings, "retell_api_key", "retell-test-key")
    cuerpo = json.dumps(_cuerpo_llamada())

    with patch("billing.incrementar_minutos", new=AsyncMock()) as cobrar, \
         patch("routers.retell._save_call_summary", new=AsyncMock()) as guardar:
        res = client.post(
            "/retell/webhook",
            content=cuerpo,
            headers={
                "x-retell-signature": _firmar_retell(cuerpo, "retell-test-key"),
                "Content-Type": "application/json",
            },
        )

    assert res.status_code == 200
    # 125 s → 3 minutos (redondeo hacia arriba, como factura la telefonía)
    cobrar.assert_awaited_once_with(CLINIC_ID, 3)
    guardar.assert_awaited_once()


def test_reentrega_de_retell_no_cobra_dos_veces(client, monkeypatch):
    monkeypatch.setattr(settings, "retell_api_key", "retell-test-key")
    cuerpo = json.dumps(_cuerpo_llamada(call_id="call_repetida"))
    headers = {
        "x-retell-signature": _firmar_retell(cuerpo, "retell-test-key"),
        "Content-Type": "application/json",
    }

    with patch("billing.incrementar_minutos", new=AsyncMock()) as cobrar, \
         patch("routers.retell._save_call_summary", new=AsyncMock()):
        primera = client.post("/retell/webhook", content=cuerpo, headers=headers)
        segunda = client.post("/retell/webhook", content=cuerpo, headers=headers)

    assert (primera.status_code, segunda.status_code) == (200, 200)
    assert cobrar.await_count == 1


def test_firma_de_retell_invalida_se_rechaza(client, monkeypatch):
    monkeypatch.setattr(settings, "retell_api_key", "retell-test-key")
    cuerpo = json.dumps(_cuerpo_llamada())

    res = client.post(
        "/retell/webhook",
        content=cuerpo,
        headers={"x-retell-signature": "v=1,d=falsa", "Content-Type": "application/json"},
    )
    assert res.status_code == 401


def test_fallo_procesando_la_llamada_libera_el_evento(client, monkeypatch, dedupe_en_memoria):
    """Si el procesamiento falla, Retell tiene que poder reintentar."""
    monkeypatch.setattr(settings, "retell_api_key", "retell-test-key")
    cuerpo = json.dumps(_cuerpo_llamada(call_id="call_falla"))
    headers = {
        "x-retell-signature": _firmar_retell(cuerpo, "retell-test-key"),
        "Content-Type": "application/json",
    }

    with patch("routers.retell._cobrar_minutos_llamada", new=AsyncMock(side_effect=RuntimeError("BD caída"))):
        res = client.post("/retell/webhook", content=cuerpo, headers=headers)

    assert res.status_code == 503
    assert dedupe_en_memoria == set(), "el claim debe liberarse para permitir el reintento"


# ── WhatsApp: webhook de Meta ────────────────────────────────────────────────

def _cuerpo_whatsapp(message_id="wamid.1", texto="Hola, quiero pedir cita"):
    return {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "metadata": {"phone_number_id": "phone-1"},
                            "messages": [
                                {
                                    "id": message_id,
                                    "from": "34600111222",
                                    "type": "text",
                                    "timestamp": "1760000000",
                                    "text": {"body": texto},
                                }
                            ],
                        }
                    }
                ]
            }
        ]
    }


def _firmar_meta(cuerpo: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), cuerpo, hashlib.sha256).hexdigest()


def test_mensaje_de_whatsapp_llega_al_agente_y_se_responde(client, monkeypatch):
    monkeypatch.setattr(settings, "meta_app_secret", "meta-test-secret")
    cuerpo = json.dumps(_cuerpo_whatsapp()).encode()

    with patch("routers.whatsapp._get_meta_clinic", new=AsyncMock(return_value=(CLINIC_ID, "token"))), \
         patch("routers.whatsapp.buscar_paciente", new=AsyncMock(return_value=None)), \
         patch("routers.whatsapp._get_active_conv", new=AsyncMock(return_value=None)), \
         patch("routers.whatsapp.run_agent", new=AsyncMock(return_value=("Claro, ¿qué día?", "conv-1"))) as agente, \
         patch("routers.whatsapp._send_meta", new=AsyncMock()) as enviar:
        res = client.post(
            "/webhook/whatsapp",
            content=cuerpo,
            headers={
                "x-hub-signature-256": _firmar_meta(cuerpo, "meta-test-secret"),
                "Content-Type": "application/json",
            },
        )

    assert res.status_code == 200
    agente.assert_awaited_once()
    assert agente.await_args.kwargs["canal"] == "whatsapp"
    assert agente.await_args.kwargs["clinic_id"] == CLINIC_ID
    enviar.assert_awaited_once()
    assert enviar.await_args.args[1] == "Claro, ¿qué día?"


def test_reentrega_de_whatsapp_no_responde_dos_veces(client, monkeypatch):
    monkeypatch.setattr(settings, "meta_app_secret", "meta-test-secret")
    cuerpo = json.dumps(_cuerpo_whatsapp(message_id="wamid.repetido")).encode()
    headers = {
        "x-hub-signature-256": _firmar_meta(cuerpo, "meta-test-secret"),
        "Content-Type": "application/json",
    }

    with patch("routers.whatsapp._get_meta_clinic", new=AsyncMock(return_value=(CLINIC_ID, "token"))), \
         patch("routers.whatsapp.buscar_paciente", new=AsyncMock(return_value=None)), \
         patch("routers.whatsapp._get_active_conv", new=AsyncMock(return_value=None)), \
         patch("routers.whatsapp.run_agent", new=AsyncMock(return_value=("Hola", "conv-1"))) as agente, \
         patch("routers.whatsapp._send_meta", new=AsyncMock()):
        client.post("/webhook/whatsapp", content=cuerpo, headers=headers)
        client.post("/webhook/whatsapp", content=cuerpo, headers=headers)

    assert agente.await_count == 1


def test_firma_de_meta_invalida_se_rechaza(client, monkeypatch):
    monkeypatch.setattr(settings, "meta_app_secret", "meta-test-secret")
    cuerpo = json.dumps(_cuerpo_whatsapp()).encode()

    res = client.post(
        "/webhook/whatsapp",
        content=cuerpo,
        headers={"x-hub-signature-256": "sha256=falsa", "Content-Type": "application/json"},
    )
    assert res.status_code == 403


def test_numero_de_whatsapp_no_asociado_devuelve_503(client, monkeypatch, dedupe_en_memoria):
    """Sin clínica asociada no se puede contestar; Meta debe poder reintentar."""
    monkeypatch.setattr(settings, "meta_app_secret", "meta-test-secret")
    cuerpo = json.dumps(_cuerpo_whatsapp(message_id="wamid.huerfano")).encode()

    with patch("routers.whatsapp._get_meta_clinic", new=AsyncMock(return_value=None)):
        res = client.post(
            "/webhook/whatsapp",
            content=cuerpo,
            headers={
                "x-hub-signature-256": _firmar_meta(cuerpo, "meta-test-secret"),
                "Content-Type": "application/json",
            },
        )

    assert res.status_code == 503
    assert dedupe_en_memoria == set()


# ── Cobros: webhook de Stripe ────────────────────────────────────────────────

def _evento_stripe(tipo, objeto, event_id="evt_1"):
    return {"id": event_id, "type": tipo, "data": {"object": objeto}}


def test_checkout_completado_activa_el_plan(client, monkeypatch):
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test")
    monkeypatch.setattr(settings, "stripe_webhook_secret", "whsec_test")

    evento = _evento_stripe(
        "checkout.session.completed",
        {
            "metadata": {"clinic_id": CLINIC_ID, "plan": "pro"},
            "customer": "cus_1",
            "subscription": "sub_1",
        },
    )
    db = MagicMock()

    with patch("stripe.Webhook.construct_event", return_value=evento), \
         patch("routers.stripe_billing.get_supabase", return_value=db):
        res = client.post(
            "/billing/webhook",
            content=json.dumps(evento),
            headers={"stripe-signature": "t=1,v1=x", "Content-Type": "application/json"},
        )

    assert res.status_code == 200
    update = db.table.return_value.update.call_args[0][0]
    assert update["plan"] == "pro"
    assert update["minutos_incluidos"] == 750
    assert update["minutos_usados_mes"] == 0
    assert update["stripe_subscription_id"] == "sub_1"
    db.table.return_value.update.return_value.eq.assert_called_with("id", CLINIC_ID)


def test_renovacion_pagada_reinicia_los_minutos(client, monkeypatch):
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test")
    monkeypatch.setattr(settings, "stripe_webhook_secret", "whsec_test")

    evento = _evento_stripe("invoice.paid", {"customer": "cus_1"}, event_id="evt_invoice")
    db = MagicMock()
    db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"id": CLINIC_ID}
    ]

    with patch("stripe.Webhook.construct_event", return_value=evento), \
         patch("routers.stripe_billing.get_supabase", return_value=db):
        res = client.post(
            "/billing/webhook",
            content=json.dumps(evento),
            headers={"stripe-signature": "t=1,v1=x", "Content-Type": "application/json"},
        )

    assert res.status_code == 200
    update = db.table.return_value.update.call_args[0][0]
    assert update["minutos_usados_mes"] == 0
    assert update["stripe_subscription_status"] == "active"


def test_reentrega_de_stripe_no_reaplica_el_evento(client, monkeypatch):
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test")
    monkeypatch.setattr(settings, "stripe_webhook_secret", "whsec_test")

    evento = _evento_stripe(
        "checkout.session.completed",
        {"metadata": {"clinic_id": CLINIC_ID, "plan": "starter"}, "customer": "cus_2", "subscription": "sub_2"},
        event_id="evt_repetido",
    )
    db = MagicMock()

    with patch("stripe.Webhook.construct_event", return_value=evento), \
         patch("routers.stripe_billing.get_supabase", return_value=db):
        primera = client.post(
            "/billing/webhook",
            content=json.dumps(evento),
            headers={"stripe-signature": "t=1,v1=x", "Content-Type": "application/json"},
        )
        segunda = client.post(
            "/billing/webhook",
            content=json.dumps(evento),
            headers={"stripe-signature": "t=1,v1=x", "Content-Type": "application/json"},
        )

    assert primera.json() == {"received": True}
    assert segunda.json() == {"received": True, "duplicate": True}
    assert db.table.return_value.update.call_count == 1


def test_suscripcion_cancelada_deja_el_plan_inactivo(client, monkeypatch):
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test")
    monkeypatch.setattr(settings, "stripe_webhook_secret", "whsec_test")

    evento = _evento_stripe("customer.subscription.deleted", {"customer": "cus_3"}, event_id="evt_cancel")
    db = MagicMock()

    with patch("stripe.Webhook.construct_event", return_value=evento), \
         patch("routers.stripe_billing.get_supabase", return_value=db):
        res = client.post(
            "/billing/webhook",
            content=json.dumps(evento),
            headers={"stripe-signature": "t=1,v1=x", "Content-Type": "application/json"},
        )

    assert res.status_code == 200
    update = db.table.return_value.update.call_args[0][0]
    assert update["plan"] == "cancelado"
    assert update["stripe_subscription_status"] == "canceled"
