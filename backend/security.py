from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

_api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)


async def require_admin_key(api_key: str = Security(_api_key_header)) -> None:
    from config import settings
    if not settings.admin_api_key:
        return  # Dev mode: key not configured, allow all
    if api_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
