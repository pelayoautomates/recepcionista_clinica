"""
Lead scoring rule-based.
Puntuación 0-100 basada en completitud de datos, canal, estado del lead e historial.
"""
from datetime import datetime, timezone


def calcular_score(lead: dict) -> dict:
    """
    Devuelve {"score": int, "nivel": str, "motivos": list[str]}.
    nivel: "alto" (>=70) | "medio" (40-69) | "bajo" (<40)
    """
    score = 0
    motivos: list[str] = []

    # Completitud de datos
    if lead.get("nombre"):
        score += 10
    if lead.get("telefono"):
        score += 20
        motivos.append("tiene teléfono")
    if lead.get("email"):
        score += 10
        motivos.append("tiene email")

    # Canal de origen (voz > whatsapp > chat)
    canal = lead.get("canal_origen", "")
    if canal == "voz":
        score += 25
        motivos.append("llamada entrante")
    elif canal == "whatsapp":
        score += 20
        motivos.append("WhatsApp")
    elif canal:
        score += 10

    # Estado del lead
    estado_scores: dict[str, int] = {
        "cita_agendada":          45,
        "completado":             35,
        "interesado":             25,
        "requiere_humano":        20,
        "contactado":             15,
        "nuevo":                  5,
        "perdido":               -15,
        "anonimo":                0,
    }
    estado = lead.get("estado_lead", "nuevo")
    estado_pts = estado_scores.get(estado, 5)
    score += estado_pts
    if estado_pts > 0:
        motivos.append(f"estado {estado}")

    # Historial disponible
    if lead.get("historial_resumen"):
        score += 10
        motivos.append("historial conversación")

    # Recencia (última interacción)
    ultima = lead.get("ultima_interaccion") or lead.get("created_at")
    if ultima:
        try:
            dt = datetime.fromisoformat(ultima.replace("Z", "+00:00"))
            diff_h = (datetime.now(timezone.utc) - dt).total_seconds() / 3600
            if diff_h < 24:
                score += 10
                motivos.append("activo hoy")
            elif diff_h < 168:  # 7 días
                score += 5
                motivos.append("activo esta semana")
        except Exception:
            pass

    score = max(0, min(100, score))
    nivel = "alto" if score >= 70 else "medio" if score >= 40 else "bajo"

    return {
        "score": score,
        "nivel": nivel,
        "motivos": motivos[:3],
    }


def enriquecer_leads(leads: list[dict]) -> list[dict]:
    """Añade campo 'scoring' a cada lead."""
    for lead in leads:
        lead["scoring"] = calcular_score(lead)
    return leads
