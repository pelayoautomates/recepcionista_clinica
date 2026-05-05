import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import admin, chat, whatsapp, vapi, auth

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restringir en producción a dominios conocidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(whatsapp.router, prefix="/webhook/whatsapp", tags=["whatsapp"])
app.include_router(vapi.router, prefix="/vapi", tags=["vapi"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])


@app.get("/health")
async def health():
    return {"status": "ok"}
