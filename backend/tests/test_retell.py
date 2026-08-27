"""Tests for Retell router — clinic_id extraction and signature validation."""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


def test_extract_clinic_id_from_metadata():
    from routers.retell import _extract_clinic_id
    call = {"metadata": {"clinic_id": "abc-123"}}
    assert _extract_clinic_id(call) == "abc-123"


def test_extract_clinic_id_from_dynamic_vars():
    from routers.retell import _extract_clinic_id
    call = {"retell_llm_dynamic_variables": {"clinic_id": "xyz-456"}}
    assert _extract_clinic_id(call) == "xyz-456"


def test_extract_clinic_id_from_message():
    from routers.retell import _extract_clinic_id
    call = {}
    message = {"metadata": {"clinic_id": "msg-789"}}
    assert _extract_clinic_id(call, message) == "msg-789"


def test_extract_clinic_id_none():
    from routers.retell import _extract_clinic_id
    assert _extract_clinic_id({}) is None


def test_extract_clinic_id_strips_whitespace():
    from routers.retell import _extract_clinic_id
    call = {"metadata": {"clinic_id": "  abc-123  "}}
    assert _extract_clinic_id(call) == "abc-123"


def test_conversation_id_deterministic():
    from routers.retell import _conversation_id_from_call_id
    id1 = _conversation_id_from_call_id("call_xyz")
    id2 = _conversation_id_from_call_id("call_xyz")
    assert id1 == id2


def test_conversation_id_different_calls():
    from routers.retell import _conversation_id_from_call_id
    assert _conversation_id_from_call_id("call_a") != _conversation_id_from_call_id("call_b")


def test_retell_response_format():
    from routers.retell import _retell_response
    r = _retell_response(response_id=5, content="Hola", content_complete=True)
    assert r["response_type"] == "response"
    assert r["response_id"] == 5
    assert r["content"] == "Hola"
    assert r["content_complete"] is True
    assert r["end_call"] is False


def test_signature_invalid_format():
    from routers.retell import _verify_retell_signature
    assert _verify_retell_signature("body", "bad-format", "key") is False


def test_signature_missing():
    from routers.retell import _verify_retell_signature
    assert _verify_retell_signature("body", "", "key") is False


def test_retell_event_key_stable_for_same_input():
    from routers.retell import _retell_event_key
    call = {"call_id": "c1", "call_status": "ended", "end_timestamp": 123}
    assert _retell_event_key("call_ended", call) == _retell_event_key("call_ended", call)


def test_retell_event_key_transcript_changes_when_transcript_changes():
    from routers.retell import _retell_event_key
    call_a = {"call_id": "c1", "transcript": "hola"}
    call_b = {"call_id": "c1", "transcript": "hola mundo"}
    assert _retell_event_key("transcript_updated", call_a) != _retell_event_key("transcript_updated", call_b)


# ── Saludo de la llamada ─────────────────────────────────────────────────────
# Decía literalmente "de la clínica", sin nombre: la primera frase que oye el
# paciente sonaba a plantilla. Ahora se construye con la clínica ya resuelta.

from unittest.mock import MagicMock, patch  # noqa: E402


def _db_clinica(nombre=None, agente=None):
    db = MagicMock()
    db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "nombre": nombre, "agente_nombre": agente,
    }
    return db


def test_saludo_incluye_el_nombre_de_la_clinica():
    from routers.retell import _saludo_para
    with patch("database.client.get_supabase", return_value=_db_clinica("Clínica Luna")):
        saludo = _saludo_para("clinic-1")
    assert "Clínica Luna" in saludo
    assert "inteligencia artificial" in saludo


def test_saludo_respeta_el_nombre_del_agente_configurado():
    from routers.retell import _saludo_para
    with patch("database.client.get_supabase", return_value=_db_clinica("Clínica Luna", "Marta")):
        saludo = _saludo_para("clinic-1")
    assert saludo.startswith("Hola, soy Marta")


def test_sin_clinic_id_usa_el_saludo_de_reserva():
    from routers.retell import RETELL_AI_GREETING, _saludo_para
    assert _saludo_para(None) == RETELL_AI_GREETING


def test_si_falla_la_consulta_se_saluda_igual():
    """Quedarse mudo al descolgar es peor que un saludo genérico."""
    from routers.retell import RETELL_AI_GREETING, _saludo_para
    db = MagicMock()
    db.table.side_effect = RuntimeError("BD caída")
    with patch("database.client.get_supabase", return_value=db):
        assert _saludo_para("clinic-1") == RETELL_AI_GREETING


def test_el_saludo_siempre_se_identifica_como_ia():
    """Obligación del art. 50 del Reglamento de IA, se sepa el nombre o no."""
    from routers.retell import RETELL_AI_GREETING, _saludo_para
    with patch("database.client.get_supabase", return_value=_db_clinica("Clínica Luna")):
        con_nombre = _saludo_para("clinic-1")
    with patch("database.client.get_supabase", return_value=_db_clinica(None)):
        sin_nombre = _saludo_para("clinic-1")

    for saludo in (con_nombre, sin_nombre, RETELL_AI_GREETING):
        assert "inteligencia artificial" in saludo.lower()
