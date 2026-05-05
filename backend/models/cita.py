from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

EstadoCita = Literal["confirmada", "cancelada", "completada", "no_asistio"]


class Cita(BaseModel):
    id: UUID
    clinic_id: UUID
    paciente_id: UUID | None = None
    google_event_id: str | None = None
    tipo_servicio: str | None = None
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None
    estado: EstadoCita = "confirmada"
    created_at: datetime


class CitaCreate(BaseModel):
    clinic_id: UUID
    paciente_id: UUID | None = None
    google_event_id: str | None = None
    tipo_servicio: str | None = None
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None


class CitaUpdate(BaseModel):
    google_event_id: str | None = None
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None
    estado: EstadoCita | None = None
