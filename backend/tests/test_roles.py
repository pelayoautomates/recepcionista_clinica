"""
Resolución de roles.

`agencia_admins` existe desde la migración 002, pero `obtener_rol` nunca la
consultaba: devolvía como mucho 'clinica'. Y crear una clínica exige rol
'agencia' en el BFF, así que el alta de un cliente nuevo respondía 403 siempre.
No había forma de dar de alta a nadie desde el panel.
"""
from unittest.mock import MagicMock, patch

import pytest

from routers.invitaciones import obtener_rol

ADMIN_ID = "13a0764b-bf4e-4be5-8971-9fa9577aad47"
CLINICA_ID = "11111111-1111-1111-1111-111111111111"


class _Consulta:
    def __init__(self, filas):
        self._filas = filas

    def select(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def limit(self, *_a, **_k):
        return self

    def single(self):
        return self

    def execute(self):
        class _R:
            data = self._filas
        return _R()


def _db(*, es_admin=False, clinica=None):
    tablas = {
        "agencia_admins": [{"user_id": ADMIN_ID}] if es_admin else [],
        "clinica_usuarios": [{"clinic_id": CLINICA_ID}] if clinica else [],
        "clinicas": clinica,
    }
    db = MagicMock()
    db.table.side_effect = lambda nombre: _Consulta(tablas.get(nombre, []))
    return db


@pytest.mark.asyncio
async def test_admin_de_agencia_obtiene_rol_agencia():
    with patch("routers.invitaciones.get_supabase", return_value=_db(es_admin=True)):
        rol = await obtener_rol(ADMIN_ID, "pelayo.automates@gmail.com")
    assert rol["rol"] == "agencia"


@pytest.mark.asyncio
async def test_el_rol_de_agencia_manda_sobre_el_de_clinica():
    """Si la misma cuenta está en las dos tablas, agencia gana."""
    db = _db(es_admin=True, clinica={"plan": "trial", "onboarding_ok": True})
    with patch("routers.invitaciones.get_supabase", return_value=db):
        rol = await obtener_rol(ADMIN_ID, "pelayo.automates@gmail.com")
    assert rol["rol"] == "agencia"


@pytest.mark.asyncio
async def test_usuario_de_clinica_sigue_siendo_clinica():
    db = _db(clinica={"trial_expires_at": None, "plan": "trial", "onboarding_ok": True})
    with patch("routers.invitaciones.get_supabase", return_value=db):
        rol = await obtener_rol("otro-user", "cliente@clinica.example")
    assert rol["rol"] == "clinica"
    assert rol["clinic_id"] == CLINICA_ID


@pytest.mark.asyncio
async def test_usuario_sin_nada_no_tiene_rol():
    with patch("routers.invitaciones.get_supabase", return_value=_db()):
        rol = await obtener_rol("desconocido", "nadie@example.com")
    assert rol["rol"] is None


@pytest.mark.asyncio
async def test_si_falla_la_consulta_de_admins_no_se_bloquea_al_usuario():
    """Un fallo leyendo agencia_admins no puede dejar sin panel a una clínica."""
    db = MagicMock()

    def _tabla(nombre):
        if nombre == "agencia_admins":
            raise RuntimeError("timeout")
        if nombre == "clinica_usuarios":
            return _Consulta([{"clinic_id": CLINICA_ID}])
        return _Consulta({"trial_expires_at": None, "plan": "trial", "onboarding_ok": True})

    db.table.side_effect = _tabla
    with patch("routers.invitaciones.get_supabase", return_value=db):
        rol = await obtener_rol("user", "cliente@clinica.example")
    assert rol["rol"] == "clinica"


# ── Códigos de desvío ────────────────────────────────────────────────────────
# Se devolvía siempre la sintaxis GSM de móvil (`**61*...*11*20#`). Casi todas
# las clínicas tienen fijo, donde el código es distinto y no admite segundos:
# se le daba al cliente un código que no le iba a funcionar.

from routers.canales import _codigos_desvio  # noqa: E402


def test_movil_usa_sintaxis_gsm_con_segundos():
    d = _codigos_desvio("+34910000001", "si_no_contestan", 20, "movil")
    assert d["activar"] == "**61*+34910000001*11*20#"
    assert d["segundos"] == 20
    assert d["desactivar"] == "##002#"
    assert d["aviso"] is None


def test_fijo_usa_un_solo_asterisco_y_no_admite_segundos():
    d = _codigos_desvio("+34910000001", "si_no_contestan", 20, "fijo")
    assert d["activar"] == "*61*+34910000001#"
    assert d["desactivar"] == "#61#"
    assert d["segundos"] is None, "en fijo el tiempo lo decide la operadora"


def test_fijo_avisa_del_coste_y_de_las_centralitas():
    d = _codigos_desvio("+34910000001", "si_no_contestan", 20, "fijo")
    assert d["aviso"] and "centralita" in d["aviso"].lower()


def test_desvio_total_tambien_cambia_segun_la_linea():
    assert _codigos_desvio("+34910000001", "siempre", 20, "movil")["activar"] == "**21*+34910000001#"
    assert _codigos_desvio("+34910000001", "siempre", 20, "fijo")["activar"] == "*21*+34910000001#"


def test_por_defecto_asume_movil():
    assert _codigos_desvio("+34910000001", "siempre")["tipo_linea"] == "movil"


def test_los_segundos_se_acotan_al_rango_que_admite_gsm():
    assert _codigos_desvio("+34910000001", "si_no_contestan", 99, "movil")["segundos"] == 30
    assert _codigos_desvio("+34910000001", "si_no_contestan", 1, "movil")["segundos"] == 5
