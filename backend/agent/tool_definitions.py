"""
Schemas JSON de las tools que usa GPT-4o via function calling.
Deben estar sincronizados con las funciones en tools/
"""

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "consultar_disponibilidad",
            "description": (
                "Consulta los horarios disponibles para agendar una cita en una fecha concreta. "
                "Úsala cuando el paciente quiera saber qué horas hay libres."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "fecha": {
                        "type": "string",
                        "description": "Fecha en formato YYYY-MM-DD. Si el paciente dice 'mañana' o 'el lunes', convierte al formato correcto."
                    },
                    "tipo_cita": {
                        "type": "string",
                        "description": "Tipo de servicio o tratamiento que solicita el paciente."
                    }
                },
                "required": ["fecha", "tipo_cita"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "crear_cita",
            "description": (
                "Crea una cita en el calendario de la clínica y registra al paciente. "
                "Úsala solo cuando el paciente haya confirmado explícitamente la fecha y hora."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "paciente_id": {
                        "type": "string",
                        "description": "UUID del paciente en el sistema."
                    },
                    "fecha_inicio_iso": {
                        "type": "string",
                        "description": "Fecha y hora de inicio en ISO 8601 (ej: 2026-05-10T10:00:00+00:00)."
                    },
                    "tipo_cita": {
                        "type": "string",
                        "description": "Tipo de servicio o tratamiento."
                    },
                    "nombre_paciente": {
                        "type": "string",
                        "description": "Nombre del paciente para el título del evento."
                    }
                },
                "required": ["paciente_id", "fecha_inicio_iso", "tipo_cita"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "mover_cita",
            "description": (
                "Mueve una cita existente a una nueva fecha y hora. "
                "Úsala cuando el paciente quiera cambiar una cita ya agendada."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "cita_id": {
                        "type": "string",
                        "description": "UUID de la cita a mover."
                    },
                    "nueva_fecha_inicio_iso": {
                        "type": "string",
                        "description": "Nueva fecha y hora en ISO 8601."
                    }
                },
                "required": ["cita_id", "nueva_fecha_inicio_iso"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "cancelar_cita",
            "description": "Cancela una cita del paciente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cita_id": {
                        "type": "string",
                        "description": "UUID de la cita a cancelar."
                    }
                },
                "required": ["cita_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_paciente",
            "description": (
                "Busca un paciente existente por número de teléfono. "
                "Úsala antes de crear un lead nuevo para evitar duplicados."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "telefono": {
                        "type": "string",
                        "description": "Número de teléfono del paciente (con o sin prefijo internacional)."
                    }
                },
                "required": ["telefono"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "crear_lead",
            "description": (
                "Registra a un nuevo paciente/lead en el sistema, o actualiza uno existente si ya hay registro. "
                "Úsala cuando el paciente proporcione sus datos de contacto."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "nombre": {"type": "string", "description": "Nombre del paciente."},
                    "telefono": {"type": "string", "description": "Teléfono del paciente."},
                    "email": {"type": "string", "description": "Email del paciente."},
                    "servicio_interes": {"type": "string", "description": "Servicio en el que está interesado."},
                    "canal": {
                        "type": "string",
                        "enum": ["chat_web", "whatsapp", "voz"],
                        "description": "Canal por el que contacta."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "actualizar_estado_lead",
            "description": "Actualiza el estado del funnel de un paciente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "paciente_id": {"type": "string", "description": "UUID del paciente."},
                    "estado": {
                        "type": "string",
                        "enum": ["anonimo", "nuevo", "contactado", "interesado", "cita_agendada", "completado", "perdido", "requiere_humano"],
                        "description": "Nuevo estado del lead."
                    }
                },
                "required": ["paciente_id", "estado"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "programar_seguimiento",
            "description": (
                "Programa un recordatorio para hacer seguimiento a un paciente que no ha agendado. "
                "Úsala cuando un paciente muestre interés pero no confirme cita."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "paciente_id": {"type": "string", "description": "UUID del paciente."},
                    "fecha_iso": {"type": "string", "description": "Fecha y hora del seguimiento en ISO 8601."},
                    "motivo": {"type": "string", "description": "Motivo del seguimiento."}
                },
                "required": ["paciente_id", "fecha_iso", "motivo"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "escalar_a_humano",
            "description": (
                "Escala la conversación al equipo de la clínica cuando: "
                "el paciente tiene dolor fuerte, sangrado, urgencia médica, queja, está enfadado, "
                "es menor de edad, hace una pregunta médica compleja, pide hablar con una persona, "
                "o solicita un presupuesto detallado."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "paciente_id": {"type": "string", "description": "UUID del paciente."},
                    "motivo": {"type": "string", "description": "Motivo del escalado."},
                    "resumen": {"type": "string", "description": "Resumen de la conversación para el equipo humano."}
                },
                "required": ["paciente_id", "motivo", "resumen"]
            }
        }
    }
]
