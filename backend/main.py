import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import admin, chat, whatsapp, vapi, auth, invitaciones, configuracion

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from jobs.scheduler import start_scheduler, stop_scheduler
    start_scheduler()
    logger.info("Scheduler iniciado")
    yield
    stop_scheduler()
    logger.info("Scheduler detenido")


app = FastAPI(
    title="Recepcionista IA — API",
    version="0.1.0",
    lifespan=lifespan,
)

_origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
_wildcard = "*" in _origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=not _wildcard,  # credentials incompatible with wildcard
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(whatsapp.router, prefix="/webhook/whatsapp", tags=["whatsapp"])
app.include_router(vapi.router, prefix="/vapi", tags=["vapi"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(invitaciones.router, prefix="/admin", tags=["invitaciones"])
app.include_router(configuracion.router, prefix="/admin", tags=["configuracion"])


@app.get("/health")
async def health():
    from database.client import get_supabase
    db_ok = False
    try:
        get_supabase().table("clinicas").select("id").limit(1).execute()
        db_ok = True
    except Exception:
        pass
    return {
        "status": "ok" if db_ok else "degraded",
        "database": db_ok,
        "environment": settings.environment,
    }
