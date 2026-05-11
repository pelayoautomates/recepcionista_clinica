"""Tests for 360dialog WhatsApp client."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_send_message_success():
    from dialog360 import send_message
    mock_response = MagicMock()
    mock_response.status_code = 200

    with patch("dialog360.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)
        result = await send_message("test-api-key", "+34600000001", "Hola, ¿cómo podemos ayudarte?")

    assert result is True


@pytest.mark.asyncio
async def test_send_message_failure():
    from dialog360 import send_message
    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.text = "Bad request"

    with patch("dialog360.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)
        result = await send_message("bad-key", "+34600000001", "Test")

    assert result is False


@pytest.mark.asyncio
async def test_send_message_network_error():
    from dialog360 import send_message
    with patch("dialog360.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(side_effect=Exception("Network error"))
        result = await send_message("key", "+1", "Test")
    assert result is False


@pytest.mark.asyncio
async def test_get_clinic_by_phone_id_found():
    from dialog360 import get_clinic_by_phone_id
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"id": "clinic-123", "dialog360_api_key": "key-abc"}
    ]
    with patch("dialog360.get_supabase", return_value=mock_db):
        result = await get_clinic_by_phone_id("phone-id-xyz")
    assert result is not None
    assert result["id"] == "clinic-123"


@pytest.mark.asyncio
async def test_get_clinic_by_phone_id_not_found():
    from dialog360 import get_clinic_by_phone_id
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = []
    with patch("dialog360.get_supabase", return_value=mock_db):
        result = await get_clinic_by_phone_id("unknown-phone")
    assert result is None
