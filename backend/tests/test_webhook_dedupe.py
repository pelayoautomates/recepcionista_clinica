"""
Regresión del dedupe de webhooks.

Un merge dejó el cuerpo de `mark_webhook_event_once` dentro de
`release_webhook_event`: la función devolvía None para cualquier evento real, de
modo que Retell, Meta y Stripe se descartaban como duplicados y ningún canal
entrante llegaba a procesarse. Estos tests fijan el contrato.
"""
import pytest

import webhook_dedupe


class _FakeTable:
    def __init__(self, store, log):
        self._store = store
        self._log = log
        self._filters = {}

    def insert(self, row):
        self._pending_insert = row
        return self

    def delete(self):
        self._pending_delete = True
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def execute(self):
        if getattr(self, "_pending_insert", None) is not None:
            key = (self._pending_insert["provider"], self._pending_insert["event_key"])
            if key in self._store:
                raise RuntimeError('duplicate key value violates unique constraint "webhook_events_pkey"')
            self._store.add(key)
            self._log.append(("insert", key))
            return self
        if getattr(self, "_pending_delete", False):
            key = (self._filters.get("provider"), self._filters.get("event_key"))
            self._store.discard(key)
            self._log.append(("delete", key))
        return self


class _FakeDB:
    def __init__(self):
        self.store = set()
        self.log = []

    def table(self, _name):
        return _FakeTable(self.store, self.log)


@pytest.fixture
def fake_db(monkeypatch):
    db = _FakeDB()
    monkeypatch.setattr(webhook_dedupe, "get_supabase", lambda: db)
    return db


def test_primer_evento_se_procesa(fake_db):
    assert webhook_dedupe.mark_webhook_event_once("retell", "call_ended:abc") is True


def test_reentrega_se_descarta(fake_db):
    assert webhook_dedupe.mark_webhook_event_once("stripe", "evt_1", "{}") is True
    assert webhook_dedupe.mark_webhook_event_once("stripe", "evt_1", "{}") is False


def test_proveedores_distintos_no_colisionan(fake_db):
    assert webhook_dedupe.mark_webhook_event_once("retell", "id-1") is True
    assert webhook_dedupe.mark_webhook_event_once("meta_whatsapp", "id-1") is True


def test_release_permite_reintento(fake_db):
    assert webhook_dedupe.mark_webhook_event_once("meta_whatsapp", "wamid.1") is True
    webhook_dedupe.release_webhook_event("meta_whatsapp", "wamid.1")
    assert webhook_dedupe.mark_webhook_event_once("meta_whatsapp", "wamid.1") is True


def test_release_no_propaga_errores_de_storage(monkeypatch):
    class _Boom:
        def table(self, _name):
            raise RuntimeError("supabase caido")

    monkeypatch.setattr(webhook_dedupe, "get_supabase", lambda: _Boom())
    webhook_dedupe.release_webhook_event("retell", "call_ended:abc")


def test_clave_larga_se_hashea(fake_db):
    larga = "x" * 500
    assert webhook_dedupe.mark_webhook_event_once("retell", larga) is True
    assert webhook_dedupe.mark_webhook_event_once("retell", larga) is False
    assert fake_db.log[0][1][1].startswith("sha256:")


def test_clave_vacia_no_bloquea_el_trafico(fake_db):
    assert webhook_dedupe.mark_webhook_event_once("retell", "") is True
    assert webhook_dedupe.mark_webhook_event_once("", "algo") is True


def test_fallo_de_storage_no_descarta_el_evento(monkeypatch):
    class _Boom:
        def table(self, _name):
            raise RuntimeError("timeout de red")

    monkeypatch.setattr(webhook_dedupe, "get_supabase", lambda: _Boom())
    assert webhook_dedupe.mark_webhook_event_once("stripe", "evt_2") is True
