"""
Preflight: ¿puede esta clínica dar una cita de verdad?

El checklist del panel solo comprobaba prompt, calendario y número. Faltaban las
dos cosas sin las cuales el agente no puede agendar por mucho que el teléfono
suene: servicios reservables por IA y profesionales con agenda. En una demo eso
se traduce en que la IA deriva a humano absolutamente todo.
"""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from config import settings

CLINIC_ID = "11111111-1111-1111-1111-111111111111"

CLINICA_COMPLETA = {
    "nombre": "Clínica Luna",
    "horarios": {"lun": {"start": "09:00", "end": "20:00"}},
    "prompt_personalizado": "Soy la recepcionista de...",
    "google_tokens_enc": "cifrado",
    "telefono": "+34910000000",
    "telefono_ia": "+34910000001",
    "meta_phone_number_id": "phone-1",
    "notif_webhook": "https://clinica.example/hook",
    "routing_mode": "siempre",
}


class _Consulta:
    def __init__(self, filas):
        self._filas = filas

    def select(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def in_(self, *_a, **_k):
        return self

    def single(self):
        return self

    def execute(self):
        class _R:
            data = self._filas
        return _R()


class _DB:
    def __init__(self, clinica, servicios, profesionales, disponibilidad):
        self._tablas = {
            "clinicas": clinica,
            "servicios": servicios,
            "profesionales": profesionales,
            "disponibilidad_profesional": disponibilidad,
        }

    def table(self, nombre):
        return _Consulta(self._tablas.get(nombre, []))


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "environment", "development")
    import main
    return TestClient(main.app)


def _preflight(client, *, clinica=None, servicios=None, profesionales=None, disponibilidad=None):
    db = _DB(
        clinica if clinica is not None else dict(CLINICA_COMPLETA),
        servicios if servicios is not None else [{"id": "s1", "reservable_ia": True, "requiere_revision": False}],
        profesionales if profesionales is not None else [{"id": "p1"}],
        disponibilidad if disponibilidad is not None else [{"profesional_id": "p1"}],
    )
    with patch("routers.admin.get_supabase", return_value=db):
        res = client.get(
            f"/admin/clinicas/{CLINIC_ID}/preflight",
            headers={"X-Admin-Key": settings.admin_api_key},
        )
    assert res.status_code == 200, res.text
    return res.json()


def test_clinica_completa_puede_agendar(client):
    data = _preflight(client)
    assert data["puede_agendar"] is True
    assert data["bloqueantes"] == []


def test_sin_servicios_reservables_no_puede_agendar(client):
    data = _preflight(client, servicios=[])
    assert data["puede_agendar"] is False
    assert "servicios" in data["bloqueantes"]


def test_un_servicio_marcado_para_revision_no_cuenta_como_reservable(client):
    data = _preflight(
        client,
        servicios=[{"id": "s1", "reservable_ia": True, "requiere_revision": True}],
    )
    assert "servicios" in data["bloqueantes"]


def test_sin_profesionales_que_acepten_ia_no_puede_agendar(client):
    data = _preflight(client, profesionales=[], disponibilidad=[])
    assert "profesionales" in data["bloqueantes"]


def test_un_profesional_sin_horario_propio_hereda_el_de_la_clinica(client):
    data = _preflight(client, disponibilidad=[])
    assert "profesionales" not in data["bloqueantes"]


def test_sin_horario_de_clinica_ni_del_profesional_es_bloqueante(client):
    clinica = dict(CLINICA_COMPLETA, horarios={})
    data = _preflight(client, clinica=clinica, disponibilidad=[])
    assert "horarios" in data["bloqueantes"]
    assert "profesionales" in data["bloqueantes"]


def test_sin_ningun_canal_activo_es_bloqueante(client):
    clinica = dict(CLINICA_COMPLETA, telefono_ia=None, meta_phone_number_id=None)
    data = _preflight(client, clinica=clinica)
    assert "canal" in data["bloqueantes"]


def test_calendario_y_avisos_no_bloquean_pero_se_reportan(client):
    clinica = dict(CLINICA_COMPLETA, google_tokens_enc=None, notif_webhook=None)
    data = _preflight(client, clinica=clinica)

    assert data["puede_agendar"] is True
    por_id = {c["id"]: c for c in data["checks"]}
    assert por_id["calendario"]["ok"] is False
    assert por_id["avisos"]["ok"] is False
    assert por_id["calendario"]["bloqueante"] is False


def test_preflight_exige_clave_de_admin(client, monkeypatch):
    monkeypatch.setattr(settings, "admin_api_key", "clave-real")
    res = client.get(f"/admin/clinicas/{CLINIC_ID}/preflight", headers={"X-Admin-Key": "clave-falsa"})
    assert res.status_code == 401
