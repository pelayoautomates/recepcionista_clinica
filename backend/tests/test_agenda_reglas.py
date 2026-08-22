"""
Reglas de agenda que el panel deja configurar y el agente tiene que respetar.

`requiere_revision` se podía marcar en el panel pero nunca llegaba al agente:
`_get_servicio` no leía la columna, así que la comprobación de
`create_appointment_validated` evaluaba siempre None y la IA reservaba sola
servicios que la clínica había marcado como "revisar antes de agendar".
"""
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest

from tools import calendario


def _servicio(**overrides):
    base = {
        "id": "servicio-1",
        "nombre": "Botox",
        "duracion_min": 45,
        "buffer_antes_min": 0,
        "buffer_despues_min": 0,
        "reservable_ia": True,
        "requiere_revision": False,
        "sala_id": None,
    }
    base.update(overrides)
    return base


def test_get_servicio_pide_requiere_revision():
    db = MagicMock()
    db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        _servicio()
    ]
    calendario._get_servicio(db, "clinic-1", "Botox")

    campos = db.table.return_value.select.call_args[0][0]
    assert "requiere_revision" in campos


@pytest.mark.asyncio
async def test_no_se_agenda_un_servicio_marcado_para_revision():
    with patch.object(calendario, "get_supabase", return_value=MagicMock()), \
         patch.object(calendario, "_get_clinic", return_value={"nombre": "Clínica"}), \
         patch.object(calendario, "_get_servicio", return_value=_servicio(requiere_revision=True)):
        result = await calendario.create_appointment_validated(
            clinic_id="clinic-1",
            paciente_id="paciente-1",
            servicio_nombre="Botox",
            fecha_inicio_iso="2026-09-01T10:00:00+02:00",
        )

    assert "revisión humana" in result["error"]
    assert "cita_id" not in result


@pytest.mark.asyncio
async def test_no_se_ofrecen_huecos_de_un_servicio_marcado_para_revision():
    with patch.object(calendario, "get_supabase", return_value=MagicMock()), \
         patch.object(calendario, "_get_clinic", return_value={"nombre": "Clínica", "reglas_reserva": {}}), \
         patch.object(calendario, "_get_servicio", return_value=_servicio(requiere_revision=True)):
        fecha = (datetime.now(calendario.TZ) + timedelta(days=3)).strftime("%Y-%m-%d")
        result = await calendario.find_available_slots("clinic-1", "Botox", fecha)

    assert result["slots_disponibles"] == []
    assert "confirmación humana" in result["error"]


def test_solapa_detecta_colisiones_pero_no_slots_contiguos():
    inicio = datetime(2026, 9, 1, 10, 0, tzinfo=calendario.TZ)
    fin = inicio + timedelta(minutes=30)

    solapado = [(inicio + timedelta(minutes=15), inicio + timedelta(minutes=45))]
    contiguo = [(fin, fin + timedelta(minutes=30))]
    anterior = [(inicio - timedelta(minutes=30), inicio)]

    assert calendario._solapa(inicio, fin, solapado) is True
    assert calendario._solapa(inicio, fin, contiguo) is False
    assert calendario._solapa(inicio, fin, anterior) is False
    assert calendario._solapa(inicio, fin, []) is False


def test_parse_dt_asume_zona_de_la_clinica_si_falta():
    naive = calendario._parse_dt("2026-09-01T10:00:00")
    assert naive is not None and naive.tzinfo is not None

    utc = calendario._parse_dt("2026-09-01T08:00:00Z")
    assert utc == naive

    assert calendario._parse_dt(None) is None
    assert calendario._parse_dt("no es una fecha") is None
