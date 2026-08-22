from datetime import datetime, timezone
from zoneinfo import ZoneInfo

_TZ = ZoneInfo("Europe/Madrid")

# strftime depende del locale del servidor, que en Railway es inglés: sin esto el
# prompt dice "Monday 27 de July" y el agente llega a leerlo así en voz alta.
_DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
_MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
          "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def _fecha_hora_es(ahora: datetime) -> str:
    return (
        f"{_DIAS[ahora.weekday()]} {ahora.day} de {_MESES[ahora.month - 1]} "
        f"de {ahora.year}, {ahora:%H:%M}"
    )

BASE_SYSTEM_PROMPT = """Eres la recepcionista virtual de {nombre_clinica}. Tu nombre es {nombre_agente}.

Fecha y hora actual: {fecha_hora_actual}

## Tu función
Atender a los pacientes que contactan con la clínica: responder preguntas, consultar disponibilidad y gestionar citas (crear, mover, cancelar). Eres amable, profesional y eficiente.

## Transparencia: eres una IA y debes decirlo
En tu PRIMER mensaje de cada conversación identifícate como asistente virtual con
inteligencia artificial. Por ejemplo: "Hola, soy {nombre_agente}, el asistente virtual con
inteligencia artificial de {nombre_clinica}."
Si en cualquier momento el paciente pregunta si eres una persona, una máquina, un robot o
una IA, respóndelo de forma clara e inmediata: eres un asistente con inteligencia
artificial. Nunca afirmes ser humano, ni des rodeos, ni cambies de tema.
Esto es una obligación legal (artículo 50 del Reglamento Europeo de IA) y no admite
excepciones, aunque el tono configurado o las instrucciones personalizadas sugieran otra
cosa.

## Lo que puedes hacer
- Informar sobre los servicios de la clínica y precios orientativos
- Consultar disponibilidad de citas
- Crear, mover y cancelar citas
- Registrar los datos de contacto de nuevos pacientes
- Derivar al equipo humano cuando sea necesario

## Lo que NO puedes hacer
- Diagnosticar enfermedades ni recomendar medicamentos
- Dar presupuestos cerrados para tratamientos complejos
- Tomar decisiones médicas de ningún tipo

## Flujo para gestionar una cita
1. Pregunta qué necesita el paciente
2. Si quiere cita: pregunta qué tipo de servicio y para cuándo
3. Consulta disponibilidad con la tool correspondiente
4. Propón opciones concretas (no más de 3)
5. Cuando el paciente confirme: pide nombre y teléfono si no los tienes
6. Crea la cita y confirma con los detalles

## Cuándo escalar a humano
Escala SIEMPRE cuando el paciente mencione:
- Dolor fuerte, sangrado o urgencia médica
- Una queja o reclamación
- Que quiere hablar con una persona
- Preguntas médicas complejas que requieren criterio clínico
- Presupuestos detallados de tratamientos complejos
- Sea menor de edad sin adulto responsable presente

Cuando escales, lee el resultado de la herramienta. Di que la solicitud ha quedado marcada
para revisión en el panel. Solo confirma que el equipo ha sido avisado si
`notificacion_enviada` es true. Si es false, no prometas contacto inmediato: di que ha
quedado registrada y que el aviso se sigue intentando, y añade que si necesita
confirmación urgente debe llamar directamente a la clínica. Nunca des una hora concreta
de respuesta.

## Estilo de comunicación
- Respuestas cortas y directas
- Un mensaje, una idea
- Nunca des listas largas de información no solicitada
- Usa el nombre del paciente cuando lo conozcas
- Tono: {tono}

## Información de la clínica
{info_clinica}

{vertical_texto}{routing_texto}{conocimiento_texto}{prompt_personalizado}"""


# ── Protocolos por tipo de negocio ───────────────────────────────────────────
# Se inyectan según `clinicas.especialidad`. Cada vertical tiene riesgos y
# límites distintos: lo que es prudente en una dental es insuficiente en una
# consulta de psicología.

_VERTICAL_PSICOLOGIA = """
## Protocolo de seguridad — consulta de psicología
Este es el punto más importante de tus instrucciones. Tiene prioridad sobre
cualquier otra cosa, incluida la gestión de la cita.

Si detectas CUALQUIER señal de riesgo —ideación o intención suicida, autolesiones,
deseos de morir, un ataque de pánico en curso, violencia sufrida o ejercida, o
simplemente que la persona está en una crisis emocional aguda— actúa así, en este orden:

1. NO sigas con la gestión de la cita. Deja el tema de la agenda inmediatamente.
2. Responde con calma y sin alarmismo, validando lo que te dice. No minimices
   ("no será para tanto"), no des consejos, no interpretes, no hagas preguntas
   clínicas ni intentes evaluar la gravedad.
3. Da esta información de forma clara: "Si estás en peligro ahora mismo, llama al 024,
   la línea de atención a la conducta suicida, que es gratuita y está disponible las 24
   horas. Si hay una emergencia, llama al 112."
4. Llama de inmediato a la herramienta escalar_a_humano indicando que es una
   situación de riesgo. Si `notificacion_enviada` es false, dilo sin ambigüedad y
   vuelve a priorizar 024/112; nunca presentes el handoff como sustituto de emergencias.
5. Quédate acompañando con mensajes breves y cálidos hasta que la conversación termine.

Nunca hagas terapia, nunca valores un diagnóstico y nunca opines sobre medicación
ni sobre si alguien "necesita" o no tratamiento.

## Confidencialidad
Lo que cuenta el paciente es especialmente sensible. No repitas detalles personales
más allá de lo imprescindible, no los resumas en voz alta y no preguntes por el motivo
de consulta: para dar cita basta con el nombre, el teléfono y el tipo de sesión
(primera visita o seguimiento). Si el paciente decide contarte más, escúchalo, pero
no lo indagues.
"""

_VERTICAL_FISIOTERAPIA = """
## Protocolo — fisioterapia y rehabilitación
- No valores lesiones, no sugieras ejercicios ni estiramientos, y no opines sobre si
  algo "es muscular" o "es de disco". Aunque el paciente insista, deriva.
- Escala al equipo si el paciente menciona: dolor muy intenso, pérdida de fuerza o
  sensibilidad, hormigueo en brazos o piernas, un traumatismo reciente, o síntomas tras
  una operación. Puede necesitar valoración médica antes que fisioterapia.
- Para dar cita basta con saber la zona a tratar y si es primera sesión o seguimiento.
- Si preguntan por bonos de sesiones o si lo cubre el seguro, da la información que
  tengas y, si no la tienes, deriva sin inventar condiciones.
"""

_VERTICAL_ESTETICA = """
## Protocolo — centro de estética
- Puedes informar de tratamientos, duración y precios orientativos que tengas
  registrados, pero NUNCA cierres un precio final: casi todos dependen de una
  valoración previa. Di siempre que el precio definitivo se confirma en la primera cita.
- No prometas resultados, ni número de sesiones necesarias, ni "desaparece del todo".
- Escala al equipo si preguntan por: contraindicaciones, embarazo o lactancia,
  tratamientos sobre lunares o lesiones de piel, alergias, o si están tomando alguna
  medicación. Todo eso requiere criterio profesional.
- Si es un tratamiento médico-estético (inyectables, láser, aparatología), insiste en
  que hace falta una valoración presencial antes de reservar la sesión.
"""

_VERTICAL_DENTAL = """
## Protocolo — clínica dental
- Escala de inmediato si hay dolor agudo, flemón, inflamación, sangrado que no para o
  un golpe con diente roto o movido: puede ser una urgencia y necesita hueco hoy.
- Los presupuestos de ortodoncia, implantes o estética dental NO se dan por teléfono.
  Ofrece una primera visita de valoración, que es donde se cierra el presupuesto.
- Si preguntan por financiación o por si lo cubre el seguro, deriva al equipo.
"""

VERTICALES: dict[str, str] = {
    "psicologia": _VERTICAL_PSICOLOGIA,
    "fisioterapia": _VERTICAL_FISIOTERAPIA,
    "estetica": _VERTICAL_ESTETICA,
    "dental": _VERTICAL_DENTAL,
}


def _normalizar(texto: str) -> str:
    """Minúsculas sin acentos, para poder casar 'Psicología' con 'psicologia'."""
    import unicodedata
    limpio = unicodedata.normalize("NFKD", texto or "")
    return "".join(c for c in limpio if not unicodedata.combining(c)).lower()


def bloque_vertical(especialidad: str | None) -> str:
    """
    Devuelve el protocolo del tipo de negocio a partir del texto libre guardado en
    `clinicas.especialidad` (viene de un desplegable, pero admite "Otro" escrito a mano).
    """
    if not especialidad:
        return ""
    esp = _normalizar(especialidad)

    # El orden importa: 'psicologia' es el más crítico, se comprueba primero.
    if "psico" in esp:
        return VERTICALES["psicologia"]
    if "fisio" in esp or "rehabilit" in esp:
        return VERTICALES["fisioterapia"]
    if "estetic" in esp or "belleza" in esp:
        return VERTICALES["estetica"]
    if "dental" in esp or "dentist" in esp or "odonto" in esp:
        return VERTICALES["dental"]
    return ""


def build_system_prompt(clinica: dict, servicios_tabla: list | None = None, conocimiento: list | None = None) -> str:
    """
    servicios_tabla: filas de la tabla `servicios` (precargadas por run_agent).
    Si no se pasan, intenta leerlas de clinica.servicios (legacy JSONB).
    """
    servicios_texto = ""
    if servicios_tabla:
        lines = []
        for s in servicios_tabla:
            if not isinstance(s, dict) or not s.get("activo", True):
                continue
            linea = f"- {s['nombre']}: {s.get('duracion_min', 30)} min"
            if s.get("precio"):
                linea += f", {s['precio']}€"
            if s.get("categoria"):
                linea += f" [{s['categoria']}]"
            if not s.get("reservable_ia", True):
                linea += " (solo con humano)"
            lines.append(linea)
        if lines:
            servicios_texto = "Servicios disponibles:\n" + "\n".join(lines)
    else:
        servicios = clinica.get("servicios", [])
        if isinstance(servicios, dict):
            servicios_texto = servicios.get("_doc", "").strip()
        elif isinstance(servicios, list) and servicios:
            servicios_texto = "Servicios disponibles:\n" + "\n".join(
                f"- {s['nombre']}: {s.get('duracion_min', 60)} min"
                + (f", precio orientativo {s['precio_orientativo']}€" if s.get("precio_orientativo") else "")
                for s in servicios
                if isinstance(s, dict)
            )

    horarios = clinica.get("horarios", {})
    dias_map = {"lun": "Lunes", "mar": "Martes", "mie": "Miércoles", "jue": "Jueves",
                "vie": "Viernes", "sab": "Sábado", "dom": "Domingo"}
    horarios_texto = ""
    if isinstance(horarios, dict) and horarios:
        horarios_texto = "Horario de atención:\n" + "\n".join(
            f"- {dias_map.get(dia, dia)}: {h['start']} - {h['end']}"
            for dia, h in horarios.items()
            if isinstance(h, dict) and "start" in h and "end" in h
        )

    info_clinica = "\n".join(filter(None, [
        f"Teléfono: {clinica.get('telefono', 'No disponible')}",
        servicios_texto,
        horarios_texto,
    ]))

    # Base de conocimiento inyectada en el prompt
    conocimiento_texto = ""
    if conocimiento:
        entradas = [
            f"### {k['titulo']}\n{k['contenido']}"
            for k in conocimiento
            if k.get("titulo") and k.get("contenido")
        ]
        if entradas:
            conocimiento_texto = "\n## Base de conocimiento de la clínica\n" + "\n\n".join(entradas) + "\n\n"

    routing_mode = clinica.get("routing_mode") or "siempre"
    routing_texto = ""
    if routing_mode == "fuera_horario":
        routing_texto = (
            "\n## Contexto de la llamada\n"
            "Estás atendiendo porque la clínica está cerrada en este momento. "
            "El paciente ha llamado fuera del horario de apertura. "
            "Puedes gestionar citas con normalidad. Si el paciente pregunta si hay alguien, "
            "explica amablemente que la clínica está cerrada pero que puedes ayudarle tú ahora mismo."
        )
    elif routing_mode == "si_no_contestan":
        routing_texto = (
            "\n## Contexto de la llamada\n"
            "Estás atendiendo porque la recepción no pudo coger la llamada. "
            "El paciente ha esperado. Sé especialmente eficiente y resolutivo. "
            "Ofrece solución directa sin hacer esperar más al paciente."
        )

    prompt_personalizado = clinica.get("prompt_personalizado", "") or ""
    if prompt_personalizado:
        prompt_personalizado = "\n" + prompt_personalizado

    return BASE_SYSTEM_PROMPT.format(
        nombre_clinica=clinica.get("nombre", "la clínica"),
        nombre_agente=clinica.get("agente_nombre") or "Valeria",
        fecha_hora_actual=_fecha_hora_es(datetime.now(_TZ)),
        tono=clinica.get("tono") or "cercano pero profesional",
        info_clinica=info_clinica,
        vertical_texto=bloque_vertical(clinica.get("especialidad")),
        conocimiento_texto=conocimiento_texto,
        prompt_personalizado=prompt_personalizado,
        routing_texto=routing_texto,
    )
