from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from starlette.requests import Request

from backend.services.session_service import SessionService


def _request(headers: dict[str, str] | None = None) -> Request:
    raw_headers = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/profile",
        "headers": raw_headers,
    }
    return Request(scope)


@pytest.mark.asyncio
async def test_resolve_session_ignores_test_headers_outside_test_env():
    gateway = MagicMock()
    gateway.is_configured.return_value = True
    gateway.auth_user = AsyncMock(return_value=None)
    service = SessionService(gateway)
    request = _request(
        {
            "x-test-user-id": "spoof-user",
            "x-test-manager": "true",
        }
    )

    with patch("backend.services.session_service.get_settings") as settings_factory:
        settings_factory.return_value.app_env = "production"
        session = await service.resolve_session(request)

    assert session is None


@pytest.mark.asyncio
async def test_resolve_session_accepts_test_headers_in_test_env():
    gateway = MagicMock()
    gateway.is_configured.return_value = True
    service = SessionService(gateway)
    request = _request(
        {
            "x-test-user-id": "u-test",
            "x-test-email": "test@example.com",
            "x-test-manager": "true",
        }
    )

    with patch("backend.services.session_service.get_settings") as settings_factory:
        settings_factory.return_value.app_env = "test"
        session = await service.resolve_session(request)

    assert session is not None
    assert session.user_id == "u-test"
    assert session.is_manager is True
