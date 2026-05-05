from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

EstadoLead = Literal[
    "anonimo", "nuevo", "contactado", "interesado",
    "cita_agendada", "completado", "perdido", "requiere_humano"
]

CanalOrigen = Literal["chat_web", "whatsapp", "voz"]


class Paciente(BaseModel):
    id: UUID
    clinic_id: UUID
    nombre: str | None = None
    telefono: str | None = None
    email: str | None = None
    canal_origen: CanalOrigen | None = None
    estado_lead: EstadoLead = "nuevo"
    historial_resumen: str | None = None
    created_at: datetime


class PacienteCreate(BaseModel):
    clinic_id: UUID
    nombre: str | None = None
    telefono: str | None = None
    email: str | None = None
    canal_origen: CanalOrigen | None = None
    estado_lead: EstadoLead = "nuevo"


class PacienteUpdate(BaseModel):
    nombre: str | None = None
    telefono: str | None = None
    email: str | None = None
    estado_lead: EstadoLead | None = None
    historial_resumen: str | None = None
