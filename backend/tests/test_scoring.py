"""Unit tests for lead scoring — no external dependencies."""
import pytest
from scoring import calcular_score, enriquecer_leads


def test_score_completo():
    lead = {
        "nombre": "Ana López",
        "telefono": "+34600000001",
        "email": "ana@example.com",
        "canal_origen": "voz",
        "estado_lead": "cita_agendada",
        "historial_resumen": "Quiere ortodoncia",
        "created_at": "2026-05-11T10:00:00Z",
    }
    result = calcular_score(lead)
    assert result["score"] == 100  # capped at 100
    assert result["nivel"] == "alto"
    assert isinstance(result["motivos"], list)
    assert len(result["motivos"]) <= 3


def test_score_minimo():
    lead = {"estado_lead": "perdido", "created_at": "2020-01-01T00:00:00Z"}
    result = calcular_score(lead)
    assert result["score"] == 0  # max(0, 0 + 5(nuevo fallback) - 15(perdido)) → 0... wait perdido=-15
    assert result["nivel"] == "bajo"


def test_score_whatsapp_interesado(sample_lead):
    result = calcular_score(sample_lead)
    # nombre(10) + telefono(20) + email(10) + whatsapp(20) + interesado(25) + resumen(10) = 95
    assert result["score"] >= 70
    assert result["nivel"] == "alto"


def test_score_sin_datos():
    result = calcular_score({})
    assert result["score"] >= 0
    assert result["nivel"] in ("alto", "medio", "bajo")


def test_score_capped_at_100():
    lead = {
        "nombre": "X", "telefono": "+1", "email": "x@x.com",
        "canal_origen": "voz", "estado_lead": "cita_agendada",
        "historial_resumen": "x", "ultima_interaccion": "2026-05-11T10:00:00Z",
    }
    result = calcular_score(lead)
    assert result["score"] <= 100


def test_estado_invalido_no_crash():
    lead = {"estado_lead": "estado_que_no_existe", "created_at": "2026-05-11T00:00:00Z"}
    result = calcular_score(lead)
    assert result["score"] >= 0


def test_enriquecer_leads(sample_lead):
    leads = [sample_lead, {"estado_lead": "nuevo", "created_at": "2026-05-11T00:00:00Z"}]
    result = enriquecer_leads(leads)
    assert all("scoring" in l for l in result)
    assert result[0]["scoring"]["score"] > result[1]["scoring"]["score"]
