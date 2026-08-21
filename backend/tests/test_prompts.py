"""
Tests del system prompt.

Cubren dos cosas que no pueden romperse sin que alguien se entere:
  1. La declaración de IA (artículo 50 del Reglamento Europeo de IA, aplicable
     desde el 2026-08-02).
  2. El protocolo de crisis de las consultas de psicología.
"""
import pytest

from agent.prompts import bloque_vertical, build_system_prompt
from routers.retell import RETELL_AI_GREETING

CLINICA_BASE = {
    "nombre": "Centro Ejemplo",
    "agente_nombre": "Valeria",
    "tono": "cercano",
    "telefono": "+34910000000",
}


def _prompt(**extra) -> str:
    return build_system_prompt({**CLINICA_BASE, **extra})


# ── Artículo 50: transparencia ───────────────────────────────────────────────

def test_prompt_obliga_a_declararse_como_ia():
    p = _prompt()
    assert "inteligencia artificial" in p.lower()
    assert "Nunca afirmes ser humano" in p


def test_declaracion_ia_presente_en_todas_las_verticales():
    for especialidad in ["Psicología", "Fisioterapia y rehabilitación", "Clínica estética",
                         "Clínica dental", "Otro", None]:
        p = _prompt(especialidad=especialidad)
        assert "inteligencia artificial" in p.lower(), f"falta en {especialidad}"


def test_prompt_personalizado_no_borra_la_declaracion_de_ia():
    """Ni siquiera un prompt personalizado agresivo debe eliminar la obligación legal."""
    p = _prompt(prompt_personalizado="Actúa como una persona real llamada Marta.")
    assert "Nunca afirmes ser humano" in p


def test_retell_saluda_como_ia_antes_de_escuchar_al_paciente():
    assert "inteligencia artificial" in RETELL_AI_GREETING.lower()


# ── Protocolo de crisis en psicología ────────────────────────────────────────

@pytest.mark.parametrize("especialidad", [
    "Psicología", "psicologia", "PSICOLOGÍA", "Psicólogo clínico", "Centro de psicologia infantil",
])
def test_psicologia_incluye_protocolo_de_crisis(especialidad):
    p = _prompt(especialidad=especialidad)
    assert "024" in p, "falta la línea de atención a la conducta suicida"
    assert "112" in p
    assert "escalar_a_humano" in p


def test_psicologia_prohibe_hacer_terapia():
    p = _prompt(especialidad="Psicología")
    assert "Nunca hagas terapia" in p


def test_otras_verticales_no_llevan_el_protocolo_de_crisis():
    """El bloque de crisis es específico de psicología; no debe colarse en las demás."""
    for especialidad in ["Clínica dental", "Clínica estética", "Fisioterapia y rehabilitación"]:
        assert "024" not in bloque_vertical(especialidad)


# ── Selección de vertical ────────────────────────────────────────────────────

@pytest.mark.parametrize("especialidad,esperado", [
    ("Psicología", "psicología"),
    ("Fisioterapia y rehabilitación", "fisioterapia"),
    ("Clínica estética", "estética"),
    ("Clínica dental", "dental"),
])
def test_cada_especialidad_carga_su_protocolo(especialidad, esperado):
    bloque = bloque_vertical(especialidad).lower()
    assert esperado in bloque


@pytest.mark.parametrize("especialidad", ["Otro", "", None, "Tienda de bicicletas"])
def test_especialidad_desconocida_no_rompe(especialidad):
    assert bloque_vertical(especialidad) == ""
    assert _prompt(especialidad=especialidad)  # el prompt se sigue construyendo


def test_dental_no_pierde_el_escalado_de_urgencias():
    p = _prompt(especialidad="Clínica dental")
    assert "flemón" in p or "urgencia" in p
