from unittest.mock import AsyncMock

import pytest

from backend.tests.test_api.helpers import assert_api_error, make_session, patch_session


@pytest.mark.asyncio
async def test_post_organizations_requires_auth(client):
    with patch_session(None):
        response = await client.post("/api/organizations", json={"name": "Cong ty A"})
    assert_api_error(response, 401, "UNAUTHORIZED")


@pytest.mark.asyncio
async def test_post_organizations_success(client):
    with patch_session(make_session()) as service:
        service.create_organization_for_owner = AsyncMock(
            return_value={
                "id": "o1",
                "name": "Cong ty A",
                "slug": "cong-ty-a",
                "logoUrl": None,
                "status": "active",
                "settings": {},
                "createdBy": "u1",
            }
        )
        response = await client.post("/api/organizations", json={"name": "Cong ty A"})
    assert response.status_code == 200
    assert response.json()["organization"]["slug"] == "cong-ty-a"


@pytest.mark.asyncio
async def test_get_organizations_current_success(client):
    with patch_session(make_session()) as service:
        service.get_current_organization = AsyncMock(
            return_value={"organization": {"id": "o1"}, "membership": {"organizationId": "o1"}}
        )
        response = await client.get("/api/organizations/current")
    assert response.status_code == 200
    assert response.json()["organization"]["id"] == "o1"


@pytest.mark.asyncio
async def test_patch_organizations_current_not_member(client):
    with patch_session(make_session()) as service:
        service.get_current_organization = AsyncMock(return_value={"organization": None, "membership": None})
        response = await client.patch("/api/organizations/current", json={"name": "Moi ten"})
    assert_api_error(response, 404, "NOT_FOUND")


@pytest.mark.asyncio
async def test_get_organizations_public_not_found(client):
    with patch_session(make_session()) as service:
        service.get_public_organization_by_slug = AsyncMock(return_value=None)
        response = await client.get("/api/organizations/unknown-slug/public")
    assert_api_error(response, 404, "NOT_FOUND")


@pytest.mark.asyncio
async def test_get_organizations_public_success(client):
    with patch_session(make_session()) as service:
        service.get_public_organization_by_slug = AsyncMock(
            return_value={"id": "o1", "name": "Cong ty A", "slug": "cong-ty-a"}
        )
        response = await client.get("/api/organizations/cong-ty-a/public")
    assert response.status_code == 200
    assert response.json()["organization"]["slug"] == "cong-ty-a"


@pytest.mark.asyncio
async def test_post_member_sync_department_no_role(client):
    with patch_session(make_session()) as service:
        service.get_profile = AsyncMock(return_value={"roleId": None})
        response = await client.post("/api/member/sync-department")
    assert response.status_code == 200
    assert response.json()["updated"] is False


@pytest.mark.asyncio
async def test_get_org_settings_demo_mode(client):
    with patch_session(make_session(mode="demo")):
        response = await client.get("/api/org-settings")
    assert response.status_code == 200
    assert response.json()["persisted"] is False


@pytest.mark.asyncio
async def test_get_org_settings_success(client):
    with patch_session(make_session()) as service:
        service.get_org_ai_tool = AsyncMock(return_value={"aiTool": "claude", "persisted": True})
        response = await client.get("/api/org-settings")
    assert response.status_code == 200
    assert response.json()["aiTool"] == "claude"


@pytest.mark.asyncio
async def test_put_org_settings_invalid_tool_demo(client):
    with patch_session(make_session(is_manager=True, mode="demo")) as service:
        service.is_primary_tool = lambda tool: tool in {"chatgpt", "claude", "gemini", "copilot"}
        response = await client.put("/api/org-settings", json={"aiTool": "bad-tool"})
    assert_api_error(response, 400, "VALIDATION_ERROR")


@pytest.mark.asyncio
async def test_put_org_settings_success(client):
    with patch_session(make_session(is_manager=True)) as service:
        service.update_org_ai_tool = AsyncMock(return_value={"aiTool": "chatgpt", "persisted": True})
        response = await client.put("/api/org-settings", json={"aiTool": "chatgpt"})
    assert response.status_code == 200
    assert response.json()["aiTool"] == "chatgpt"
