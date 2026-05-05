from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel

TipoJob = Literal["recordatorio_24h", "recordatorio_1h", "seguimiento_lead", "resumen_diario"]
EstadoJob = Literal["pendiente", "ejecutando", "ejecutado", "fallido"]


class Job(BaseModel):
    id: UUID
    clinic_id: UUID
    paciente_id: UUID | None = None
    tipo: TipoJob
    fecha_programada: datetime
    estado: EstadoJob = "pendiente"
    idempotency_key: str
    payload: dict[str, Any] = {}
    error: str | None = None
    intentos: int = 0
    created_at: datetime


class JobCreate(BaseModel):
    clinic_id: UUID
    paciente_id: UUID | None = None
    tipo: TipoJob
    fecha_programada: datetime
    idempotency_key: str
    payload: dict[str, Any] = {}
