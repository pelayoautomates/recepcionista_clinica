import logging

from database.client import get_supabase

logger = logging.getLogger(__name__)


async def buscar_paciente(clinic_id: str, telefono: str) -> dict | None:
    """Busca un paciente por teléfono en la clínica. Devuelve el paciente o None."""
    db = get_supabase()
    result = db.table("pacientes") \
        .select("*") \
        .eq("clinic_id", clinic_id) \
        .eq("telefono", telefono) \
        .limit(1) \
        .execute()

    if result.data:
        return result.data[0]
    return None


async def crear_lead(
    clinic_id: str,
    nombre: str | None = None,
    telefono: str | None = None,
    email: str | None = None,
    servicio_interes: str | None = None,
    canal: str = "chat_web",
) -> dict:
    """
    Crea un nuevo lead o fusiona con uno existente si ya hay un paciente con ese teléfono.
    Devuelve el paciente (creado o existente).
    """
    db = get_supabase()

    # Intentar fusionar si hay teléfono
    if telefono:
        existente = await buscar_paciente(clinic_id, telefono)
        if existente:
            # Actualizar datos si faltan
            update = {}
            if nombre and not existente.get("nombre"):
                update["nombre"] = nombre
            if email and not existente.get("email"):
                update["email"] = email
            if update:
                db.table("pacientes").update(update).eq("id", existente["id"]).execute()
                existente.update(update)
            logger.info("Lead fusionado con paciente existente %s", existente["id"])
            return existente

    paciente_data = {
        "clinic_id": clinic_id,
        "nombre": nombre,
        "telefono": telefono,
        "email": email,
        "canal_origen": canal,
        "estado_lead": "nuevo",
    }
    result = db.table("pacientes").insert(paciente_data).execute()
    paciente = result.data[0]
    logger.info("Lead creado: %s en clínica %s", paciente["id"], clinic_id)
    return paciente


async def actualizar_estado_lead(paciente_id: str, estado: str) -> dict:
    """Actualiza el estado del funnel de un paciente."""
    estados_validos = {
        "anonimo", "nuevo", "contactado", "interesado",
        "cita_agendada", "completado", "perdido", "requiere_humano"
    }
    if estado not in estados_validos:
        raise ValueError(f"Estado inválido: {estado}")

    db = get_supabase()
    result = db.table("pacientes").update({"estado_lead": estado}).eq("id", paciente_id).execute()
    logger.info("Estado lead paciente %s → %s", paciente_id, estado)
    return result.data[0]
