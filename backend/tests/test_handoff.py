"""
Handoff a humano: entrega a dos destinatarios y cola durable.

Antes se avisaba a un único destino (el webhook de la clínica *o* el global) en
un solo intento en línea. Si ese webhook estaba caído, la escalada se perdía sin
rastro salvo la conversación marcada en el panel, que nadie mira justo cuando
hace falta.
"""
from unittest.mock import MagicMock, patch

import pytest

from tools import sistema


class _RespuestaOK:
    def raise_for_status(self):
        return None


class _ClienteFalso:
    """Sustituto de httpx.AsyncClient que registra a dónde se ha llamado."""

    def __init__(self, fallan=()):
        self.llamadas: list[str] = []
        self._fallan = set(fallan)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False

    async def post(self, url, json=None):
        self.llamadas.append(url)
        if url in self._fallan:
            raise RuntimeError("destino caído")
        return _RespuestaOK()


def _db_con_webhook(url: str | None):
    db = MagicMock()
    db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "notif_webhook": url
    }
    return db


@pytest.mark.asyncio
async def test_avisa_a_la_clinica_y_a_la_agencia():
    cliente = _ClienteFalso()
    with patch.object(sistema, "get_supabase", return_value=_db_con_webhook("https://clinica.example/hook")), \
         patch("config.settings.notify_webhook_url", "https://agencia.example/hook"), \
         patch("outbound.validate_public_http_url", side_effect=lambda url, **_: url), \
         patch("httpx.AsyncClient", return_value=cliente):
        entregado, destinos = await sistema.entregar_aviso_escalada(
            clinic_id="clinic-1",
            paciente_id="paciente-1",
            conversacion_id="conv-1",
            motivo="urgencia",
            resumen="dolor fuerte",
        )

    assert entregado is True
    assert len(destinos) == 2
    assert cliente.llamadas == ["https://clinica.example/hook", "https://agencia.example/hook"]


@pytest.mark.asyncio
async def test_basta_con_que_un_destino_confirme():
    cliente = _ClienteFalso(fallan={"https://clinica.example/hook"})
    with patch.object(sistema, "get_supabase", return_value=_db_con_webhook("https://clinica.example/hook")), \
         patch("config.settings.notify_webhook_url", "https://agencia.example/hook"), \
         patch("outbound.validate_public_http_url", side_effect=lambda url, **_: url), \
         patch("httpx.AsyncClient", return_value=cliente):
        entregado, destinos = await sistema.entregar_aviso_escalada(
            clinic_id="clinic-1",
            paciente_id="p",
            conversacion_id="c",
            motivo="queja",
            resumen="",
        )

    assert entregado is True
    assert destinos == ["https://agencia.example/hook"]


@pytest.mark.asyncio
async def test_sin_destinatarios_no_se_inventa_una_entrega():
    with patch.object(sistema, "get_supabase", return_value=_db_con_webhook(None)), \
         patch("config.settings.notify_webhook_url", ""):
        entregado, destinos = await sistema.entregar_aviso_escalada(
            clinic_id="clinic-1", paciente_id="p", conversacion_id="c", motivo="", resumen=""
        )

    assert entregado is False
    assert destinos == []


@pytest.mark.asyncio
async def test_escalada_fallida_queda_en_cola_para_reintento():
    db = MagicMock()
    db.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
        {"id": "conv-1", "clinic_id": "clinic-1"}
    ]

    with patch.object(sistema, "get_supabase", return_value=db), \
         patch.object(sistema, "entregar_aviso_escalada", return_value=(False, [])):
        resultado = await sistema.escalar_a_humano("clinic-1", "paciente-1", "urgencia", "resumen")

    assert resultado["notificacion_enviada"] is False
    assert resultado["reintento_encolado"] is True
    assert resultado["registrado_en_panel"] is True

    encolado = [
        c for c in db.table.return_value.upsert.call_args_list
        if c[0][0].get("tipo") == "escalada_humano"
    ]
    assert len(encolado) == 1
    job = encolado[0][0][0]
    assert job["clinic_id"] == "clinic-1"
    assert job["estado"] == "pendiente"
    assert job["payload"]["conversacion_id"] == "conv-1"


@pytest.mark.asyncio
async def test_escalada_entregada_no_encola_nada():
    db = MagicMock()
    db.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []

    with patch.object(sistema, "get_supabase", return_value=db), \
         patch.object(sistema, "entregar_aviso_escalada", return_value=(True, ["https://x.example"])):
        resultado = await sistema.escalar_a_humano("clinic-1", "paciente-1", "queja", "resumen")

    assert resultado["notificacion_enviada"] is True
    assert resultado["reintento_encolado"] is False
    assert resultado["destinos_notificados"] == 1
    assert db.table.return_value.upsert.call_count == 0


def test_el_job_de_escalada_falla_si_nadie_confirma():
    from jobs.scheduler import _reintentar_escalada

    job = {
        "clinic_id": "clinic-1",
        "paciente_id": "paciente-1",
        "payload": {"conversacion_id": "conv-1", "motivo": "urgencia", "resumen": ""},
    }
    with patch("tools.sistema.entregar_aviso_escalada", return_value=(False, [])):
        with pytest.raises(RuntimeError):
            _reintentar_escalada(job)


def test_el_job_de_escalada_pasa_si_alguien_confirma():
    from jobs.scheduler import _reintentar_escalada

    job = {
        "clinic_id": "clinic-1",
        "paciente_id": "paciente-1",
        "payload": {"conversacion_id": "conv-1", "motivo": "urgencia", "resumen": ""},
    }
    with patch("tools.sistema.entregar_aviso_escalada", return_value=(True, ["https://x.example"])):
        _reintentar_escalada(job)
