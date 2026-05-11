"""
Pytest fixtures shared across all tests.
Tests that hit Supabase or external APIs use mocks.
"""
import os
import pytest

# Set dummy env vars before any import that triggers Settings()
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("OPENAI_API_KEY", "sk-test")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-secret")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
os.environ.setdefault("FERNET_KEY", "ZmDfcTF7_60GrrY167zsiPd67pEvs0aGOv2oasOM1Pg=")
os.environ.setdefault("ADMIN_API_KEY", "test-admin-key")

import pytest_asyncio
from httpx import AsyncClient, ASGITransport


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture
def sample_clinic_id():
    return "11111111-1111-1111-1111-111111111111"


@pytest.fixture
def sample_lead():
    return {
        "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "nombre": "María García",
        "telefono": "+34600000001",
        "email": "maria@example.com",
        "canal_origen": "whatsapp",
        "estado_lead": "interesado",
        "created_at": "2026-05-11T10:00:00Z",
        "historial_resumen": "Quiere consulta de ortodoncia",
    }
