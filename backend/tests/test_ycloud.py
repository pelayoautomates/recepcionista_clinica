"""
WhatsApp vía YCloud.

Se añade como alternativa a Meta directo porque YCloud soporta Coexistence: la
clínica conserva su app de WhatsApp Business mientras la IA contesta por la API
sobre el mismo número. Conectar el número a Meta directo se la quitaba, que era
el mayor punto de fricción del alta.
"""
import hashlib
import hmac
import json
import time
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

import ycloud
from config import settings

CLINIC_ID = "11111111-1111-1111-1111-111111111111"
SECRET = "whsec_ycloud_test"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(settings, "ycloud_webhook_secret", SECRET)
    import main
    return TestClient(main.app)


@pytest.fixture(autouse=True)
def dedupe_en_memoria(monkeypatch):
    """Dedupe real contra una tabla en memoria (ver test_canales_integracion)."""
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

    monkeypatch.setattr(webhook_dedupe, "get_supabase", lambda: type("_DB", (), {"table": lambda s, n: _Tabla()})())
    return claims


def _firmar(cuerpo: bytes, secret: str = SECRET, ts: int | None = None) -> str:
    ts = ts or int(time.time())
    firma = hmac.new(secret.encode(), f"{ts}.".encode() + cuerpo, hashlib.sha256).hexdigest()
    return f"t={ts},s={firma}"


def _evento(msg_id="wamid.yc1", texto="Hola, quiero pedir cita", tipo="text", para="34910000001"):
    contenido = {"body": texto} if tipo == "text" else None
    mensaje = {
        "id": msg_id,
        "wabaId": "waba-1",
        "from": "34600111222",
        "to": para,
        "type": tipo,
    }
    if contenido:
        mensaje["text"] = contenido
    return {
        "id": f"evt_{msg_id}",
        "type": "whatsapp.inbound_message.received",
        "apiVersion": "v2",
        "whatsappInboundMessage": mensaje,
    }


# ── Firma ────────────────────────────────────────────────────────────────────

def test_firma_valida_se_acepta(monkeypatch):
    monkeypatch.setattr(settings, "ycloud_webhook_secret", SECRET)
    cuerpo = b'{"type":"whatsapp.inbound.message"}'
    assert ycloud.verify_signature(cuerpo, _firmar(cuerpo)) is True


def test_firma_de_otro_secreto_se_rechaza(monkeypatch):
    monkeypatch.setattr(settings, "ycloud_webhook_secret", SECRET)
    cuerpo = b'{"type":"whatsapp.inbound.message"}'
    assert ycloud.verify_signature(cuerpo, _firmar(cuerpo, secret="otro")) is False


def test_cuerpo_manipulado_invalida_la_firma(monkeypatch):
    monkeypatch.setattr(settings, "ycloud_webhook_secret", SECRET)
    firma = _firmar(b'{"a":1}')
    assert ycloud.verify_signature(b'{"a":2}', firma) is False


def test_firma_caducada_se_rechaza(monkeypatch):
    """Sin ventana temporal, una firma capturada valdría para siempre."""
    monkeypatch.setattr(settings, "ycloud_webhook_secret", SECRET)
    cuerpo = b'{"a":1}'
    viejo = int(time.time()) - 3600
    assert ycloud.verify_signature(cuerpo, _firmar(cuerpo, ts=viejo)) is False


def test_cabecera_malformada_se_rechaza(monkeypatch):
    monkeypatch.setattr(settings, "ycloud_webhook_secret", SECRET)
    for cabecera in ("", "basura", "t=abc,s=def", "s=solo-firma"):
        assert ycloud.verify_signature(b"{}", cabecera) is False


def test_sin_secreto_falla_cerrado_en_produccion(monkeypatch):
    monkeypatch.setattr(settings, "ycloud_webhook_secret", "")
    monkeypatch.setattr(settings, "environment", "production")
    assert ycloud.verify_signature(b"{}", "t=1,s=x") is False


# ── Normalización ────────────────────────────────────────────────────────────

def test_to_e164_quita_el_mas_y_los_separadores():
    assert ycloud.to_e164("+34 910 00 00 01") == "34910000001"
    assert ycloud.to_e164("34910000001") == "34910000001"
    assert ycloud.to_e164("+34-910-000-001") == "34910000001"


def test_extraer_mensaje_ignora_eventos_que_no_son_entrantes():
    assert ycloud.extraer_mensaje({"type": "whatsapp.message.updated"}) is None
    assert ycloud.extraer_mensaje({}) is None


def test_extraer_mensaje_devuelve_los_campos_que_usa_el_router():
    m = ycloud.extraer_mensaje(_evento())
    assert m == {
        "id": "wamid.yc1",
        "de": "34600111222",
        "para": "34910000001",
        "tipo": "text",
        "texto": "Hola, quiero pedir cita",
    }


# ── Webhook entrante ─────────────────────────────────────────────────────────

def test_mensaje_llega_al_agente_y_se_contesta(client):
    cuerpo = json.dumps(_evento()).encode()

    with patch("routers.whatsapp._get_ycloud_clinic", new=AsyncMock(return_value=(CLINIC_ID, "34910000001"))), \
         patch("routers.whatsapp.buscar_paciente", new=AsyncMock(return_value=None)), \
         patch("routers.whatsapp._get_active_conv", new=AsyncMock(return_value=None)), \
         patch("routers.whatsapp.run_agent", new=AsyncMock(return_value=("Claro, ¿qué día?", "conv-1"))) as agente, \
         patch("ycloud.send_text", new=AsyncMock(return_value=True)) as enviar:
        res = client.post(
            "/webhook/whatsapp/ycloud",
            content=cuerpo,
            headers={"YCloud-Signature": _firmar(cuerpo), "Content-Type": "application/json"},
        )

    assert res.status_code == 200
    agente.assert_awaited_once()
    assert agente.await_args.kwargs["clinic_id"] == CLINIC_ID
    assert agente.await_args.kwargs["canal"] == "whatsapp"
    enviar.assert_awaited_once()
    assert enviar.await_args.args[2] == "Claro, ¿qué día?"


def test_firma_invalida_se_rechaza_con_403(client):
    cuerpo = json.dumps(_evento()).encode()
    res = client.post(
        "/webhook/whatsapp/ycloud",
        content=cuerpo,
        headers={"YCloud-Signature": "t=1,s=falsa", "Content-Type": "application/json"},
    )
    assert res.status_code == 403


def test_reentrega_no_contesta_dos_veces(client):
    cuerpo = json.dumps(_evento(msg_id="wamid.repetido")).encode()
    headers = {"YCloud-Signature": _firmar(cuerpo), "Content-Type": "application/json"}

    with patch("routers.whatsapp._get_ycloud_clinic", new=AsyncMock(return_value=(CLINIC_ID, "34910000001"))), \
         patch("routers.whatsapp.buscar_paciente", new=AsyncMock(return_value=None)), \
         patch("routers.whatsapp._get_active_conv", new=AsyncMock(return_value=None)), \
         patch("routers.whatsapp.run_agent", new=AsyncMock(return_value=("Hola", "conv-1"))) as agente, \
         patch("ycloud.send_text", new=AsyncMock(return_value=True)):
        client.post("/webhook/whatsapp/ycloud", content=cuerpo, headers=headers)
        client.post("/webhook/whatsapp/ycloud", content=cuerpo, headers=headers)

    assert agente.await_count == 1


def test_evento_de_estado_se_ignora_sin_error(client):
    cuerpo = json.dumps({"id": "evt_x", "type": "whatsapp.message.updated"}).encode()
    res = client.post(
        "/webhook/whatsapp/ycloud",
        content=cuerpo,
        headers={"YCloud-Signature": _firmar(cuerpo), "Content-Type": "application/json"},
    )
    assert res.status_code == 200


def test_numero_no_asociado_devuelve_503_y_libera_el_evento(client, dedupe_en_memoria):
    cuerpo = json.dumps(_evento(msg_id="wamid.huerfano")).encode()

    with patch("routers.whatsapp._get_ycloud_clinic", new=AsyncMock(return_value=None)):
        res = client.post(
            "/webhook/whatsapp/ycloud",
            content=cuerpo,
            headers={"YCloud-Signature": _firmar(cuerpo), "Content-Type": "application/json"},
        )

    assert res.status_code == 503
    assert dedupe_en_memoria == set()


def test_audio_pide_que_lo_escriban_y_no_llama_al_agente(client):
    cuerpo = json.dumps(_evento(msg_id="wamid.audio", tipo="audio", texto="")).encode()

    with patch("routers.whatsapp._get_ycloud_clinic", new=AsyncMock(return_value=(CLINIC_ID, "34910000001"))), \
         patch("routers.whatsapp.run_agent", new=AsyncMock()) as agente, \
         patch("ycloud.send_text", new=AsyncMock(return_value=True)) as enviar:
        res = client.post(
            "/webhook/whatsapp/ycloud",
            content=cuerpo,
            headers={"YCloud-Signature": _firmar(cuerpo), "Content-Type": "application/json"},
        )

    assert res.status_code == 200
    agente.assert_not_awaited()
    enviar.assert_awaited_once()


# ── Envío ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_send_text_manda_el_cuerpo_que_espera_ycloud(monkeypatch):
    monkeypatch.setattr(settings, "ycloud_api_key", "sk_test")
    capturado = {}

    class _Resp:
        status_code = 200
        text = ""

    class _Cliente:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False
        async def post(self, url, json=None, headers=None):
            capturado["url"] = url
            capturado["json"] = json
            capturado["headers"] = headers
            return _Resp()

    with patch("httpx.AsyncClient", return_value=_Cliente()):
        ok = await ycloud.send_text("+34910000001", "+34600111222", "Hola")

    assert ok is True
    assert capturado["url"].endswith("/whatsapp/messages/sendDirectly")
    assert capturado["headers"]["X-API-Key"] == "sk_test"
    assert capturado["json"] == {
        "from": "34910000001",
        "to": "34600111222",
        "type": "text",
        "text": {"body": "Hola"},
    }


@pytest.mark.asyncio
async def test_send_template_usa_la_estructura_de_plantilla(monkeypatch):
    """Es la única forma de escribir fuera de la ventana de 24 h de Meta."""
    monkeypatch.setattr(settings, "ycloud_api_key", "sk_test")
    capturado = {}

    class _Resp:
        status_code = 200
        text = ""

    class _Cliente:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False
        async def post(self, url, json=None, headers=None):
            capturado.update(json)
            return _Resp()

    with patch("httpx.AsyncClient", return_value=_Cliente()):
        ok = await ycloud.send_template(
            "+34910000001", "+34600111222", "recordatorio_cita",
            ["María", "Clínica Luna", "12/09 a las 10:00"],
        )

    assert ok is True
    assert capturado["type"] == "template"
    assert capturado["template"]["name"] == "recordatorio_cita"
    assert capturado["template"]["language"]["code"] == "es"
    params = capturado["template"]["components"][0]["parameters"]
    assert [p["text"] for p in params] == ["María", "Clínica Luna", "12/09 a las 10:00"]


@pytest.mark.asyncio
async def test_sin_api_key_no_intenta_enviar(monkeypatch):
    monkeypatch.setattr(settings, "ycloud_api_key", "")
    assert await ycloud.send_text("+34910000001", "+34600111222", "Hola") is False


# El panel de YCloud nombra el evento `whatsapp.inbound_message.received` y su
# documentación `whatsapp.inbound.message`. Si solo se acepta uno, los mensajes
# se descartan en silencio: ni error, ni log, ni respuesta al paciente.

def test_acepta_el_nombre_de_evento_del_panel():
    body = _evento()
    body["type"] = "whatsapp.inbound_message.received"
    assert ycloud.extraer_mensaje(body) is not None


def test_acepta_el_nombre_de_evento_de_la_documentacion():
    body = _evento()
    body["type"] = "whatsapp.inbound.message"
    assert ycloud.extraer_mensaje(body) is not None


def test_evento_entrante_sin_cuerpo_reconocible_no_revienta():
    assert ycloud.extraer_mensaje({"type": "whatsapp.inbound_message.received"}) is None


def test_eventos_de_coexistence_se_ignoran():
    """Con Coexistence llegan echoes de lo que escribe la recepcionista."""
    for tipo in ("whatsapp.smb.message.echoes", "whatsapp.smb.history",
                 "whatsapp.template.reviewed", "whatsapp.message.updated"):
        assert ycloud.extraer_mensaje({"type": tipo}) is None
