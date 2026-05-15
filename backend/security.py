from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

_api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)


async def require_admin_key(api_key: str = Security(_api_key_header)) -> None:
    from config import settings
    if not settings.admin_api_key:
        # Fail-closed in production to avoid exposing /admin endpoints.
        if settings.is_production:
            raise HTTPException(status_code=500, detail="ADMIN_API_KEY no configurada en producción")
        return  # Local/dev fallback
    if api_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
