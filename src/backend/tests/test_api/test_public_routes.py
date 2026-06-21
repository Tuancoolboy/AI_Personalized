from unittest.mock import AsyncMock, patch

import pytest

from backend.tests.test_api.helpers import (
    assert_api_error,
    make_session,
    patch_manager,
    patch_service,
    patch_session,
)


@pytest.mark.asyncio
async def test_post_lead_success(client):
    with patch_service() as service:
        service.create_lead = AsyncMock(return_value={"ok": True, "persisted": True})
        response = await client.post("/api/leads", json={"email": "a@test.com", "name": "A"})
    assert response.status_code == 200
    assert response.json()["persisted"] is True


@pytest.mark.asyncio
async def test_post_lead_rejects_invalid_email(client):
    response = await client.post("/api/leads", json={"email": "not-an-email"})
    assert_api_error(response, 400, "VALIDATION_ERROR")


@pytest.mark.asyncio
async def test_get_leads_requires_manager(client):
    with patch_session(make_session(is_manager=False)):
        response = await client.get("/api/leads")
    assert_api_error(response, 403, "FORBIDDEN")


@pytest.mark.asyncio
async def test_get_leads_success(client):
    with patch_session(make_session(is_manager=True)) as service:
        service.list_leads = AsyncMock(return_value={"leads": [], "total": 0})
        response = await client.get("/api/leads")
    assert response.status_code == 200
    assert response.json()["total"] == 0


@pytest.mark.asyncio
async def test_get_invite_accept_redirects_without_auth(client):
    with patch(
        "backend.api.public_routes.get_supabase_gateway",
    ) as gateway_factory:
        gateway = gateway_factory.return_value
        gateway.is_configured = lambda: True
        gateway.auth_user = AsyncMock(return_value=None)
        response = await client.get("/moi/token-abc/accept")

    assert response.status_code == 302
    assert "/login" in response.headers["location"]


@pytest.mark.asyncio
async def test_post_invite_accept_redirects_on_success(client):
    user = type("User", (), {"id": "u1", "email": "a@test.com"})()
    with patch(
        "backend.api.public_routes.get_supabase_gateway",
    ) as gateway_factory, patch(
        "backend.services.invite_service.InviteService.accept_organization_invite",
        new=AsyncMock(return_value={"ok": True, "redirectPath": "/lo-trinh"}),
    ):
        gateway = gateway_factory.return_value
        gateway.is_configured = lambda: True
        gateway.auth_user = AsyncMock(return_value=user)
        response = await client.post(
            "/moi/token-abc/accept",
            headers={"Authorization": "Bearer test-token"},
        )
    assert response.status_code == 302
    assert response.headers["location"].endswith("/lo-trinh")
