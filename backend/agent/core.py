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


def _dentro_horario(horarios: dict) -> bool:
    """Devuelve True si ahora mismo está dentro del horario de la clínica."""
    from zoneinfo import ZoneInfo
    TZ = ZoneInfo("Europe/Madrid")
    ahora = datetime.now(TZ)
    dias = {0: "lun", 1: "mar", 2: "mie", 3: "jue", 4: "vie", 5: "sab", 6: "dom"}
    dia = dias[ahora.weekday()]
    horario = horarios.get(dia)
    if not horario:
        return False
    try:
        h_ini = datetime.strptime(horario["start"], "%H:%M").time()
        h_fin = datetime.strptime(horario["end"], "%H:%M").time()
        return h_ini <= ahora.time() <= h_fin
    except Exception:
        return False

# Dispatcher: mapea nombre de tool → función async
async def _dispatch_tool(
    tool_name: str,
    args: dict,
    clinic_id: str,
    conversacion_id: str | None = None,
    canal: str = "chat_web",
) -> str:
    from tools.calendario import consultar_disponibilidad, crear_cita, mover_cita, cancelar_cita, buscar_citas_paciente
    from tools.pacientes import buscar_paciente, crear_lead, actualizar_estado_lead
    from tools.sistema import programar_seguimiento, escalar_a_humano, agregar_a_lista_espera

    # Mapeo canal → origen
    _CANAL_ORIGEN = {"chat_web": "ia_chat", "whatsapp": "ia_whatsapp", "voz": "ia_llamada"}

    try:
        if tool_name == "consultar_disponibilidad":
            result = await consultar_disponibilidad(clinic_id, **args)
        elif tool_name == "crear_cita":
            # Inyectar conversacion_id y origen desde contexto si no los da el LLM
            if conversacion_id and "conversacion_id" not in args:
                args["conversacion_id"] = conversacion_id
            if "origen" not in args:
                args["origen"] = _CANAL_ORIGEN.get(canal, "ia_chat")
            result = await crear_cita(clinic_id, **args)
        elif tool_name == "mover_cita":
            result = await mover_cita(**args)
        elif tool_name == "cancelar_cita":
            result = await cancelar_cita(**args)
        elif tool_name == "buscar_citas_paciente":
            result = await buscar_citas_paciente(clinic_id, **args)
        elif tool_name == "buscar_paciente":
            result = await buscar_paciente(clinic_id, **args)
        elif tool_name == "crear_lead":
            result = await crear_lead(clinic_id, **args)
        elif tool_name == "actualizar_estado_lead":
            result = await actualizar_estado_lead(clinic_id, **args)
        elif tool_name == "programar_seguimiento":
            result = await programar_seguimiento(**args)
        elif tool_name == "agregar_a_lista_espera":
            result = await agregar_a_lista_espera(**args)
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
    skip_billing: bool = False,
) -> tuple[str, str]:
    """
    Ejecuta el agente para un mensaje entrante.
    Devuelve (respuesta_texto, conversacion_id).
    """
    db = get_supabase()

    # Billing unificado para todos los canales (chat, WhatsApp, voz).
    if not skip_billing:
        from billing import check_plan_active
        await check_plan_active(clinic_id)

    # Cargar o crear conversación
    if conversacion_id:
        conv_res = (
            db.table("conversaciones")
            .select("id, mensajes, paciente_id, estado")
            .eq("id", conversacion_id)
            .eq("clinic_id", clinic_id)
            .single()
            .execute()
        )
        conversacion = conv_res.data or {}
        if not conversacion:
            conversacion_id = None
    else:
        conversacion = {}

    if not conversacion_id:
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

    # Si la conversación está en mano humana no hace falta cargar nada más
    if conversacion.get("estado") == "esperando_humano":
        return "Un miembro del equipo de la clínica se pondrá en contacto contigo en breve.", conversacion_id

    historial = conversacion.get("mensajes") or []

    # Resolver paciente: request > conversación existente > lead anónimo nuevo
    paciente_id_resuelto = paciente_id or conversacion.get("paciente_id")
    if not paciente_id_resuelto:
        from tools.pacientes import crear_lead
        anon = await crear_lead(clinic_id, canal=canal)
        paciente_id_resuelto = anon["id"]
        db.table("conversaciones").update({"paciente_id": paciente_id_resuelto}).eq("id", conversacion_id).eq("clinic_id", clinic_id).execute()
    elif paciente_id_resuelto != conversacion.get("paciente_id"):
        db.table("conversaciones").update({"paciente_id": paciente_id_resuelto}).eq("id", conversacion_id).eq("clinic_id", clinic_id).execute()

    # Cargar solo los campos que el agente necesita (no tokens cifrados ni datos de billing)
    _CLINICA_FIELDS = "nombre, agente_nombre, tono, telefono, horarios, servicios, routing_mode, prompt_personalizado"
    clinica_res = db.table("clinicas").select(_CLINICA_FIELDS).eq("id", clinic_id).single().execute()
    clinica = clinica_res.data
    if not clinica:
        raise ValueError(f"Clinica {clinic_id} no encontrada")

    # routing_mode: si es "fuera_horario" y estamos dentro del horario → no atender
    routing_mode = clinica.get("routing_mode", "siempre")
    if routing_mode == "fuera_horario" and canal != "test":
        if _dentro_horario(clinica.get("horarios") or {}):
            telefono_clinica = clinica.get("telefono", "la clínica")
            return (
                f"Ahora mismo el equipo de {clinica.get('nombre', 'la clínica')} está disponible. "
                f"Contacta directamente al {telefono_clinica}.",
                conversacion_id,
            )

    servicios_res = db.table("servicios").select(
        "nombre, duracion_min, precio, categoria, reservable_ia, activo"
    ).eq("clinic_id", clinic_id).eq("activo", True).order("orden").execute()
    servicios_tabla = servicios_res.data or []

    conocimiento_res = db.table("conocimientos").select("titulo, contenido, tipo") \
        .eq("clinic_id", clinic_id).eq("activo", True).order("orden").execute()
    conocimiento = conocimiento_res.data or []

    # Construir messages para OpenAI (solo role+content, sin campos extra como timestamp)
    system_prompt = build_system_prompt(clinica, servicios_tabla=servicios_tabla, conocimiento=conocimiento)
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
                result = await _dispatch_tool(
                    tool_call.function.name, args, clinic_id,
                    conversacion_id=conversacion_id, canal=canal,
                )
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result,
                })
        else:
            # Respuesta final
            respuesta = msg.content or ""
            messages.append({"role": "assistant", "content": respuesta})
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
        "paciente_id": paciente_id_resuelto,
    }).eq("id", conversacion_id).eq("clinic_id", clinic_id).execute()

    if not skip_billing:
        from billing import incrementar_minutos
        await incrementar_minutos(clinic_id, 1)

    return respuesta, conversacion_id
