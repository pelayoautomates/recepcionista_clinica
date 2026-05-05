from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class Horario(BaseModel):
    start: str  # "09:00"
    end: str    # "20:00"


class Servicio(BaseModel):
    nombre: str
    duracion_min: int
    precio_orientativo: float | None = None


class Clinica(BaseModel):
    id: UUID
    nombre: str
    telefono: str | None = None
    whatsapp_number: str | None = None
    email_contacto: str | None = None
    horarios: dict[str, Horario] = {}
    servicios: list[Servicio] = []
    prompt_personalizado: str | None = None
    created_at: datetime


class ClinicaCreate(BaseModel):
    nombre: str
    telefono: str | None = None
    whatsapp_number: str | None = None
    email_contacto: str | None = None
    horarios: dict[str, Any] = {}
    servicios: list[Any] = []
    prompt_personalizado: str | None = None


class ClinicaUpdate(BaseModel):
    nombre: str | None = None
    telefono: str | None = None
    whatsapp_number: str | None = None
    email_contacto: str | None = None
    horarios: dict[str, Any] | None = None
    servicios: list[Any] | None = None
    prompt_personalizado: str | None = None
