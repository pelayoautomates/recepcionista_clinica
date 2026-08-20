import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings
from rate_limit import limiter
from routers import admin, chat, whatsapp, retell, auth, invitaciones, configuracion, canales, registro
from routers import stripe_billing

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        return response


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
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Security headers en todas las respuestas
app.add_middleware(SecurityHeadersMiddleware)

_origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
_wildcard = "*" in _origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=not _wildcard,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Admin-Key", "X-Requested-With"],
)

app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(whatsapp.router, prefix="/webhook/whatsapp", tags=["whatsapp"])
app.include_router(retell.router, prefix="/retell", tags=["retell"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(invitaciones.router, prefix="/admin", tags=["invitaciones"])
app.include_router(configuracion.router, prefix="/admin", tags=["configuracion"])
app.include_router(canales.router, prefix="/admin", tags=["canales"])
app.include_router(registro.router, prefix="/saas", tags=["registro"])
app.include_router(stripe_billing.router, prefix="/billing", tags=["billing"])


@app.get("/health")
async def health(response: Response):
    from database.client import get_supabase
    from jobs.scheduler import scheduler_status
    db_ok = False
    try:
        get_supabase().table("clinicas").select("id").limit(1).execute()
        db_ok = True
    except Exception:
        pass
    if not db_ok:
        response.status_code = 503
    return {
        "status": "ok" if db_ok else "degraded",
        "database": db_ok,
        "environment": settings.environment,
        "scheduler": scheduler_status(),
    }
