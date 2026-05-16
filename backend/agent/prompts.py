from datetime import datetime, timezone
from zoneinfo import ZoneInfo

_TZ = ZoneInfo("Europe/Madrid")

BASE_SYSTEM_PROMPT = """Eres la recepcionista virtual de {nombre_clinica}. Tu nombre es {nombre_agente}.

Fecha y hora actual: {fecha_hora_actual}

## Tu función
Atender a los pacientes que contactan con la clínica: responder preguntas, consultar disponibilidad y gestionar citas (crear, mover, cancelar). Eres amable, profesional y eficiente.

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

Cuando escales, di exactamente: "Voy a pasarte con el equipo de la clínica, te contactarán en breve."

## Estilo de comunicación
- Respuestas cortas y directas
- Un mensaje, una idea
- Nunca des listas largas de información no solicitada
- Usa el nombre del paciente cuando lo conozcas
- Tono: {tono}

## Información de la clínica
{info_clinica}

{routing_texto}{conocimiento_texto}{prompt_personalizado}"""


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
        fecha_hora_actual=datetime.now(_TZ).strftime("%A %d de %B de %Y, %H:%M"),
        tono=clinica.get("tono") or "cercano pero profesional",
        info_clinica=info_clinica,
        conocimiento_texto=conocimiento_texto,
        prompt_personalizado=prompt_personalizado,
        routing_texto=routing_texto,
    )
