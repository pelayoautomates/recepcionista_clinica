from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel

EstadoConversacion = Literal["activa", "esperando_humano", "resuelta"]
Canal = Literal["chat_web", "whatsapp", "voz"]


class Mensaje(BaseModel):
    role: Literal["user", "assistant", "tool", "system"]
    content: str
    timestamp: datetime
    tool_call_id: str | None = None
    tool_name: str | None = None


class Conversacion(BaseModel):
    id: UUID
    clinic_id: UUID
    paciente_id: UUID | None = None
    canal: Canal | None = None
    mensajes: list[dict[str, Any]] = []
    estado: EstadoConversacion = "activa"
    created_at: datetime
    updated_at: datetime


class ConversacionCreate(BaseModel):
    clinic_id: UUID
    paciente_id: UUID | None = None
    canal: Canal | None = None


class ChatRequest(BaseModel):
    clinic_id: UUID
    conversacion_id: UUID | None = None
    mensaje: str
    paciente_id: UUID | None = None
