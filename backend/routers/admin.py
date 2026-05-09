import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from database.client import get_supabase
from models.clinica import ClinicaCreate, ClinicaUpdate
from security import require_admin_key

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_admin_key)])


# ─── Clínicas ───────────────────────────────────────────────────────────────

@router.get("/clinicas")
async def listar_clinicas():
    db = get_supabase()
    result = db.table("clinicas").select(
        "id, nombre, telefono, whatsapp_number, email_contacto, horarios, servicios, google_tokens_enc, created_at"
    ).execute()
    # No devolver los tokens cifrados, solo indicar si existe
    for c in result.data:
        c["google_tokens_enc"] = bool(c.get("google_tokens_enc"))
    return result.data


@router.get("/clinicas/{clinic_id}")
async def obtener_clinica(clinic_id: UUID):
    db = get_supabase()
    result = db.table("clinicas").select(
        "id, nombre, telefono, telefono_ia, telnyx_number_id, whatsapp_number, "
        "email_contacto, horarios, servicios, prompt_personalizado, google_tokens_enc, "
        "url_web, especialidad, agente_nombre, notif_email, "
        "plan, trial_expires_at, minutos_incluidos, minutos_usados_mes, "
        "retell_agent_id, onboarding_ok, created_at"
    ).eq("id", str(clinic_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    # No devolver tokens cifrados, solo indicar si existe
    result.data["google_tokens_enc"] = bool(result.data.get("google_tokens_enc"))
    return result.data


@router.post("/clinicas")
async def crear_clinica(data: ClinicaCreate):
    db = get_supabase()
    result = db.table("clinicas").insert(data.model_dump(exclude_none=True)).execute()
    return result.data[0]


@router.patch("/clinicas/{clinic_id}")
async def actualizar_clinica(clinic_id: UUID, data: ClinicaUpdate):
    db = get_supabase()
    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    result = db.table("clinicas").update(updates).eq("id", str(clinic_id)).execute()
    return result.data[0]


# ─── Leads / Pacientes ───────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/leads")
async def listar_leads(clinic_id: UUID, estado: str | None = None, canal: str | None = None):
    db = get_supabase()
    query = db.table("pacientes").select("*").eq("clinic_id", str(clinic_id))
    if estado:
        query = query.eq("estado_lead", estado)
    if canal:
        query = query.eq("canal_origen", canal)
    result = query.order("created_at", desc=True).execute()
    return result.data


# ─── Conversaciones ──────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/conversaciones")
async def listar_conversaciones(clinic_id: UUID, estado: str | None = None):
    db = get_supabase()
    query = db.table("conversaciones") \
        .select("id, paciente_id, canal, estado, created_at, updated_at") \
        .eq("clinic_id", str(clinic_id))
    if estado:
        query = query.eq("estado", estado)
    result = query.order("updated_at", desc=True).execute()
    return result.data


@router.get("/clinicas/{clinic_id}/conversaciones/{conv_id}")
async def ver_conversacion(clinic_id: UUID, conv_id: UUID):
    db = get_supabase()
    result = db.table("conversaciones") \
        .select("*") \
        .eq("clinic_id", str(clinic_id)) \
        .eq("id", str(conv_id)) \
        .single() \
        .execute()
    return result.data


@router.patch("/clinicas/{clinic_id}/conversaciones/{conv_id}/resolver")
async def resolver_conversacion(clinic_id: UUID, conv_id: UUID):
    db = get_supabase()
    result = db.table("conversaciones") \
        .update({"estado": "resuelta"}) \
        .eq("id", str(conv_id)) \
        .eq("clinic_id", str(clinic_id)) \
        .execute()
    return result.data[0]


@router.post("/clinicas/{clinic_id}/conversaciones/{conv_id}/responder")
async def responder_manualmente(clinic_id: UUID, conv_id: UUID, body: dict):
    """Añade una respuesta manual del humano a la conversación."""
    from datetime import datetime, timezone
    db = get_supabase()

    conv = db.table("conversaciones") \
        .select("mensajes") \
        .eq("id", str(conv_id)) \
        .eq("clinic_id", str(clinic_id)) \
        .single() \
        .execute()

    mensajes = conv.data.get("mensajes") or []
    mensajes.append({
        "role": "assistant",
        "content": body.get("mensaje", ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "from_human": True,
    })

    result = db.table("conversaciones") \
        .update({
            "mensajes": mensajes,
            "estado": "activa",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }) \
        .eq("id", str(conv_id)) \
        .eq("clinic_id", str(clinic_id)) \
        .execute()
    return result.data[0]


# ─── Citas ───────────────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/citas")
async def listar_citas(
    clinic_id: UUID,
    fecha: str | None = None,
    fecha_inicio: str | None = None,
    fecha_fin: str | None = None,
    estado: str | None = None,
):
    db = get_supabase()
    query = db.table("citas").select("*, pacientes(nombre, telefono)").eq("clinic_id", str(clinic_id))
    if fecha:
        query = query.gte("fecha_inicio", f"{fecha}T00:00:00Z").lte("fecha_inicio", f"{fecha}T23:59:59Z")
    if fecha_inicio:
        query = query.gte("fecha_inicio", fecha_inicio)
    if fecha_fin:
        query = query.lte("fecha_inicio", fecha_fin)
    if estado:
        query = query.eq("estado", estado)
    result = query.order("fecha_inicio").execute()
    return result.data


@router.get("/clinicas/{clinic_id}/leads/{lead_id}")
async def obtener_lead(clinic_id: UUID, lead_id: UUID):
    db = get_supabase()
    result = db.table("pacientes").select("*").eq("clinic_id", str(clinic_id)).eq("id", str(lead_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return result.data


# ─── Jobs ────────────────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/jobs")
async def listar_jobs(clinic_id: UUID, estado: str | None = None):
    db = get_supabase()
    query = db.table("jobs").select("*").eq("clinic_id", str(clinic_id))
    if estado:
        query = query.eq("estado", estado)
    result = query.order("fecha_programada", desc=True).execute()
    return result.data


# ─── Métricas rápidas ────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/metricas")
async def metricas_clinica(clinic_id: UUID):
    db = get_supabase()
    from datetime import date
    hoy = date.today().isoformat()

    leads_hoy = db.table("pacientes") \
        .select("id", count="exact") \
        .eq("clinic_id", str(clinic_id)) \
        .gte("created_at", f"{hoy}T00:00:00Z") \
        .execute()

    citas_hoy = db.table("citas") \
        .select("id", count="exact") \
        .eq("clinic_id", str(clinic_id)) \
        .gte("fecha_inicio", f"{hoy}T00:00:00Z") \
        .lte("fecha_inicio", f"{hoy}T23:59:59Z") \
        .execute()

    pendientes_humano = db.table("conversaciones") \
        .select("id", count="exact") \
        .eq("clinic_id", str(clinic_id)) \
        .eq("estado", "esperando_humano") \
        .execute()

    return {
        "leads_hoy": leads_hoy.count or 0,
        "citas_hoy": citas_hoy.count or 0,
        "conversaciones_esperando_humano": pendientes_humano.count or 0,
    }
