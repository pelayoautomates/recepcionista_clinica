"""
Schemas JSON de las tools que usa GPT-4o via function calling.
Sincronizados con tools/calendario.py y las funciones de pacientes/conversaciones.
"""

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "consultar_disponibilidad",
            "description": (
                "Consulta los horarios disponibles para agendar una cita en una fecha concreta. "
                "SIEMPRE úsala antes de crear una cita para confirmar que el slot existe. "
                "Comprueba horarios del profesional, bloques de vacaciones, citas existentes y Google Calendar. "
                "Si no hay slots disponibles, propón fechas alternativas."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "fecha": {
                        "type": "string",
                        "description": "Fecha en formato YYYY-MM-DD. Convierte 'mañana', 'el lunes', etc. al formato correcto."
                    },
                    "tipo_cita": {
                        "type": "string",
                        "description": "Nombre EXACTO del servicio tal como aparece en el catálogo de la clínica. Si no lo sabes, pregunta al paciente."
                    },
                    "profesional_id": {
                        "type": "string",
                        "description": "UUID del profesional preferido. Opcional — si no se especifica, el sistema asigna el primero disponible."
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
                "Crea una cita en el calendario de la clínica. "
                "SOLO úsala cuando el paciente haya confirmado explícitamente la fecha y hora de un slot que ya has consultado. "
                "La función valida automáticamente: servicio, profesional, bloqueos, conflictos y Google Calendar. "
                "Si devuelve error, comunica el problema al paciente y propón alternativas."
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
                        "description": "Fecha y hora de inicio en ISO 8601 (ej: 2026-05-10T10:00:00+00:00). Usa el valor inicio_iso del slot consultado."
                    },
                    "tipo_cita": {
                        "type": "string",
                        "description": "Nombre del servicio, igual que en consultar_disponibilidad."
                    },
                    "nombre_paciente": {
                        "type": "string",
                        "description": "Nombre del paciente para el título del evento."
                    },
                    "profesional_id": {
                        "type": "string",
                        "description": "UUID del profesional del slot consultado. Usa el valor profesional_id devuelto por consultar_disponibilidad."
                    },
                    "conversacion_id": {
                        "type": "string",
                        "description": "UUID de la conversación actual. Se vincula automáticamente a la cita para trazabilidad."
                    },
                    "origen": {
                        "type": "string",
                        "enum": ["ia_llamada", "ia_whatsapp", "ia_chat"],
                        "description": "Canal por el que se agenda la cita."
                    }
                },
                "required": ["paciente_id", "fecha_inicio_iso", "tipo_cita"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_citas_paciente",
            "description": (
                "Busca las citas del paciente (futuras y recientes). "
                "SIEMPRE úsala antes de mover o cancelar una cita, para obtener el cita_id correcto. "
                "También úsala cuando el paciente pregunte por sus citas o quiera ver cuándo tiene su próxima visita."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "paciente_id": {
                        "type": "string",
                        "description": "UUID del paciente. Debe haberse obtenido antes con buscar_paciente o crear_lead."
                    }
                },
                "required": ["paciente_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "mover_cita",
            "description": (
                "Mueve una cita existente a una nueva fecha y hora. "
                "Valida que el nuevo slot esté libre antes de mover. "
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
            "description": "Cancela una cita del paciente en el calendario interno y en Google Calendar si está conectado.",
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
                "Úsala SIEMPRE antes de crear un lead nuevo para evitar duplicados."
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
                "Registra a un nuevo paciente/lead en el sistema, o actualiza uno existente. "
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
                        "enum": [
                            "anonimo", "nuevo", "contactado", "interesado",
                            "cita_agendada",
                            "completado", "perdido", "requiere_humano"
                        ],
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
                "Programa un seguimiento comercial solo si el sistema confirma que existe consentimiento SMS. "
                "Nunca prometas el envío si la herramienta devuelve un error de consentimiento o desactivación."
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
            "name": "agregar_a_lista_espera",
            "description": (
                "Añade al paciente a la lista de espera cuando no hay disponibilidad para el servicio "
                "que solicita. Úsala SOLO cuando hayas confirmado que no hay ningún hueco disponible. "
                "El equipo de la clínica le contactará cuando se libere un hueco."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "paciente_id": {"type": "string", "description": "UUID del paciente."},
                    "servicio_nombre": {"type": "string", "description": "Nombre del servicio que el paciente quiere."},
                    "notas": {"type": "string", "description": "Preferencias del paciente (horario, profesional, etc.)"},
                },
                "required": ["paciente_id", "servicio_nombre"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "escalar_a_humano",
            "description": (
                "Escala la conversación al equipo de la clínica. Úsala cuando: "
                "el paciente tiene urgencia médica, dolor fuerte, sangrado, está enfadado, "
                "pide hablar con una persona, hace preguntas médicas complejas, "
                "el servicio no existe en el catálogo, no hay disponibilidad disponible, "
                "la cita requiere aprobación o el precio no está claro. Lee siempre "
                "notificacion_enviada: si es false, no prometas que el equipo ya fue avisado."
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
