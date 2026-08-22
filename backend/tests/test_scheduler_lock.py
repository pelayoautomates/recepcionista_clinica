"""
Leader lock de las tareas de barrido del scheduler.

APScheduler arranca dentro de cada réplica del backend. Los jobs de la tabla
`jobs` tienen claim atómico propio, pero el sync de Google Calendar y el reset de
períodos de facturación no lo tenían y se ejecutaban una vez por réplica.
"""
from unittest.mock import MagicMock, patch

from jobs import scheduler


def _db_que_devuelve(valor):
    db = MagicMock()
    db.rpc.return_value.execute.return_value.data = valor
    return db


def test_toma_el_lock_cuando_esta_libre():
    db = _db_que_devuelve(True)
    with patch("database.client.get_supabase", return_value=db):
        assert scheduler._tomar_lock("sync_gcal", 60) is True

    nombre, args = db.rpc.call_args[0]
    assert nombre == "try_acquire_scheduler_lock"
    assert args["p_name"] == "sync_gcal"
    assert args["p_ttl_seconds"] == 60
    assert args["p_holder"] == scheduler._INSTANCE_ID


def test_cede_cuando_el_lock_es_de_otra_replica():
    with patch("database.client.get_supabase", return_value=_db_que_devuelve(False)):
        assert scheduler._tomar_lock("sync_gcal", 60) is False


def test_falla_en_abierto_si_la_funcion_rpc_no_existe():
    """Duplicar trabajo idempotente es preferible a dejar de hacerlo."""
    db = MagicMock()
    db.rpc.side_effect = RuntimeError("function try_acquire_scheduler_lock does not exist")
    with patch("database.client.get_supabase", return_value=db):
        assert scheduler._tomar_lock("sync_gcal", 60) is True


def test_cada_replica_tiene_identidad_propia():
    assert scheduler._INSTANCE_ID
    assert scheduler._INSTANCE_ID.count(":") == 2


def test_las_tareas_de_barrido_respetan_el_lock():
    with patch.object(scheduler, "_tomar_lock", return_value=False) as lock, \
         patch("database.client.get_supabase") as db:
        scheduler._sync_all_gcal()
        scheduler._reset_periodos_facturacion()
        scheduler._programar_recordatorios_pendientes()

    assert lock.call_count == 3
    assert db.call_count == 0, "sin lock no se debe tocar la base de datos"


# ── Jobs sin nada que enviar ────────────────────────────────────────────────
# En producción había 8 recordatorios en estado `ejecutado` que no habían enviado
# nada: la cita no tenía paciente y el handler hacía `return` en silencio.

def _job_ejecutado_con(handler_side_effect):
    """Ejecuta un job y devuelve el estado con el que quedó."""
    db = MagicMock()
    db.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": "j1"}]

    estados = []
    original_update = db.table.return_value.update

    def _capturar(payload):
        if "estado" in payload:
            estados.append(payload["estado"])
        return original_update.return_value

    db.table.return_value.update = _capturar

    with patch("database.client.get_supabase", return_value=db), \
         patch.object(scheduler, "_enviar_recordatorio_sms", side_effect=handler_side_effect):
        scheduler._ejecutar_job({"id": "j1", "tipo": "recordatorio_24h", "intentos": 0,
                                 "fecha_programada": "2026-09-01T10:00:00+00:00"})
    return estados


def test_job_sin_destinatario_queda_cancelado_no_ejecutado():
    estados = _job_ejecutado_con(scheduler.JobOmitido("la cita no tiene paciente asociado"))
    assert "cancelado" in estados
    assert "ejecutado" not in estados


def test_job_entregado_queda_ejecutado():
    estados = _job_ejecutado_con(None)
    assert "ejecutado" in estados


def test_job_con_error_real_se_reintenta():
    estados = _job_ejecutado_con(RuntimeError("el proveedor SMS devolvió 500"))
    assert "pendiente" in estados
    assert "ejecutado" not in estados
