import json
import logging
from datetime import datetime, timezone
from uuid import UUID

from openai import AsyncOpenAI

from agent.prompts import build_system_prompt
from agent.tool_definitions import TOOL_DEFINITIONS
from config import settings
from database.client import get_supabase

logger = logging.getLogger(__name__)

openai_client = AsyncOpenAI(api_key=settings.openai_api_key)

# Dispatcher: mapea nombre de tool → función async
async def _dispatch_tool(tool_name: str, args: dict, clinic_id: str) -> str:
    from tools.calendario import consultar_disponibilidad, crear_cita, mover_cita, cancelar_cita
    from tools.pacientes import buscar_paciente, crear_lead, actualizar_estado_lead
    from tools.sistema import programar_seguimiento, escalar_a_humano

    try:
        if tool_name == "consultar_disponibilidad":
            result = await consultar_disponibilidad(clinic_id, **args)
        elif tool_name == "crear_cita":
            result = await crear_cita(clinic_id, **args)
        elif tool_name == "mover_cita":
            result = await mover_cita(**args)
        elif tool_name == "cancelar_cita":
            result = await cancelar_cita(**args)
        elif tool_name == "buscar_paciente":
            result = await buscar_paciente(clinic_id, **args)
        elif tool_name == "crear_lead":
            result = await crear_lead(clinic_id, **args)
        elif tool_name == "actualizar_estado_lead":
            result = await actualizar_estado_lead(**args)
        elif tool_name == "programar_seguimiento":
            result = await programar_seguimiento(**args)
        elif tool_name == "escalar_a_humano":
            result = await escalar_a_humano(**args)
        else:
            result = {"error": f"Tool desconocida: {tool_name}"}

        return json.dumps(result, ensure_ascii=False, default=str)

    except Exception as e:
        logger.error("Error ejecutando tool %s: %s", tool_name, e)
        return json.dumps({"error": str(e)})


async def run_agent(
    clinic_id: str,
    conversacion_id: str | None,
    user_message: str,
    canal: str = "chat_web",
    paciente_id: str | None = None,
) -> tuple[str, str]:
    """
    Ejecuta el agente para un mensaje entrante.
    Devuelve (respuesta_texto, conversacion_id).
    """
    db = get_supabase()

    # Cargar configuración de la clínica
    clinica_res = db.table("clinicas").select("*").eq("id", clinic_id).single().execute()
    clinica = clinica_res.data

    # Cargar o crear conversación
    if conversacion_id:
        conv_res = db.table("conversaciones").select("*").eq("id", conversacion_id).single().execute()
        conversacion = conv_res.data
        historial = conversacion["mensajes"]
    else:
        conv_data = {
            "clinic_id": clinic_id,
            "paciente_id": paciente_id,
            "canal": canal,
            "mensajes": [],
            "estado": "activa",
        }
        conv_res = db.table("conversaciones").insert(conv_data).execute()
        conversacion = conv_res.data[0]
        conversacion_id = conversacion["id"]
        historial = []

    # Si la conversación está en mano humana, no responder
    if conversacion.get("estado") == "esperando_humano":
        return "Un miembro del equipo de la clínica se pondrá en contacto contigo en breve.", conversacion_id

    # Construir messages para OpenAI (solo role+content, sin campos extra como timestamp)
    system_prompt = build_system_prompt(clinica)
    messages = [{"role": "system", "content": system_prompt}]
    for h in (historial if isinstance(historial, list) else []):
        if not isinstance(h, dict):
            continue
        role = h.get("role")
        content = h.get("content")
        if role in {"user", "assistant"} and isinstance(content, str):
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_message})

    # Loop de function calling
    max_iterations = 10
    for _ in range(max_iterations):
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
        )
        msg = response.choices[0].message

        if msg.tool_calls:
            # Ejecutar todas las tool calls
            messages.append(msg.model_dump(exclude_unset=True))
            for tool_call in msg.tool_calls:
                args = json.loads(tool_call.function.arguments)
                logger.info("Tool call: %s(%s)", tool_call.function.name, args)
                result = await _dispatch_tool(tool_call.function.name, args, clinic_id)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result,
                })
        else:
            # Respuesta final
            respuesta = msg.content or ""
            break
    else:
        respuesta = "Lo siento, ha ocurrido un error procesando tu consulta. Por favor, llama directamente a la clínica."
        logger.error("Loop de function calling superó el máximo de iteraciones")

    # Guardar historial actualizado (sin system/tool ni payloads técnicos)
    nuevo_historial = messages[1:]  # Excluir system
    nuevo_historial_guardado = []
    for m in nuevo_historial:
        role = m.get("role")
        if role not in {"user", "assistant"}:
            continue

        content = m.get("content")
        if not isinstance(content, str):
            continue

        texto = content.strip()
        if not texto or texto.lower() in {"null", "none", "undefined"}:
            continue

        m_copy = dict(m)
        m_copy["content"] = texto
        if "timestamp" not in m_copy:
            m_copy["timestamp"] = datetime.now(timezone.utc).isoformat()
        nuevo_historial_guardado.append(m_copy)

    db.table("conversaciones").update({
        "mensajes": nuevo_historial_guardado,
        "paciente_id": paciente_id,
    }).eq("id", conversacion_id).execute()

    return respuesta, conversacion_id
