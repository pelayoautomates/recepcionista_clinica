"""
Rate limiting centralizado para el backend FastAPI.
Usa slowapi (wrapper de limits sobre Redis o memoria).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
