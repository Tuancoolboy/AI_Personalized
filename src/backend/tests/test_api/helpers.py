from __future__ import annotations

import contextlib
from contextlib import contextmanager
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

from backend.services.types import NativeSession

SERVICE_PATCH_TARGETS = [
    "backend.api.deps.get_native_app_service",
    "backend.api.user_routes.get_native_app_service",
    "backend.api.learning_routes.get_native_app_service",
    "backend.api.chat_routes.get_native_app_service",
    "backend.api.org_routes.get_native_app_service",
    "backend.api.manager_routes.get_native_app_service",
    "backend.api.public_routes.get_native_app_service",
]


def make_session(
    *,
    user_id: str = "u1",
    mode: str = "supabase",
    is_manager: bool = False,
    email: str | None = "a@test.com",
) -> NativeSession:
    return NativeSession(
        mode=mode,
        user_id=user_id,
        email=email,
        is_manager=is_manager,
    )


def make_manager_membership(
    *,
    organization_id: str = "org1",
    organization_name: str = "Org 1",
    role: str = "manager",
) -> dict[str, Any]:
    return {
        "organizationId": organization_id,
        "organizationName": organization_name,
        "role": role,
    }


def _mock_service() -> MagicMock:
    return MagicMock()


@contextmanager
def patch_service():
    service = _mock_service()
    with contextlib.ExitStack() as stack:
        for target in SERVICE_PATCH_TARGETS:
            stack.enter_context(patch(target, return_value=service))
        yield service


@contextmanager
def patch_session(session: NativeSession | None):
    with patch_service() as service:
        service.resolve_session = AsyncMock(return_value=session)
        yield service


@contextmanager
def patch_manager(session: NativeSession, membership: dict[str, Any] | None):
    with patch_session(session) as service:
        service.get_manager_context = AsyncMock(return_value=membership)
        yield service


def assert_api_error(response, status: int, code: str | None = None) -> dict[str, Any]:
    assert response.status_code == status
    body = response.json()
    detail = body.get("detail", body)
    if code is not None:
        assert detail.get("code") == code
    return detail
