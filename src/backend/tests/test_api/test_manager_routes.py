from unittest.mock import AsyncMock, patch

import pytest

from backend.tests.test_api.helpers import (
    assert_api_error,
    make_manager_membership,
    make_session,
    patch_manager,
    patch_service,
    patch_session,
)


@pytest.mark.asyncio
async def test_get_manager_team_requires_manager(client):
    with patch_manager(make_session(), None):
        response = await client.get("/api/manager/team")
    assert_api_error(response, 403, "FORBIDDEN")


@pytest.mark.asyncio
async def test_get_manager_team_success(client):
    membership = make_manager_membership()
    with patch_manager(make_session(user_id="manager1", is_manager=True), membership) as service:
        service.load_organization_members = AsyncMock(
            return_value={
                "members": [{"id": "u2"}],
                "total": 1,
                "organizationName": "Org 1",
                "persisted": True,
            }
        )
        response = await client.get("/api/manager/team")
    assert response.status_code == 200
    assert response.json()["total"] == 1


@pytest.mark.asyncio
async def test_post_manager_team_success(client):
    membership = make_manager_membership()
    with patch_manager(make_session(user_id="manager1", is_manager=True), membership) as service:
        service.add_manager_team_member = AsyncMock(
            return_value={
                "member": {"id": "u2"},
                "persisted": True,
                "message": "ok",
                "organizationName": "Org 1",
            }
        )
        response = await client.post("/api/manager/team", json={"email": "u2@test.com"})
    assert response.status_code == 200
    assert response.json()["member"]["id"] == "u2"


@pytest.mark.asyncio
async def test_post_manager_team_invalid_email(client):
    membership = make_manager_membership()
    with patch_manager(make_session(user_id="manager1", is_manager=True), membership) as service:
        service.add_manager_team_member = AsyncMock(
            side_effect=ValueError("VALIDATION: Email không hợp lệ.")
        )
        response = await client.post("/api/manager/team", json={"email": "sai-email"})
    assert_api_error(response, 400, "VALIDATION_ERROR")


@pytest.mark.asyncio
async def test_get_manager_invite_links_demo_mode(client):
    membership = make_manager_membership(organization_id="demo", organization_name="Org Demo")
    with patch_manager(
        make_session(user_id="manager1", is_manager=True, mode="demo"),
        membership,
    ):
        response = await client.get("/api/manager/invite-links")
    assert response.status_code == 200
    assert response.json()["persisted"] is False


@pytest.mark.asyncio
async def test_post_manager_invite_links_success(client):
    membership = make_manager_membership()
    invite_row = {
        "id": "link1",
        "organization_id": "org1",
        "created_by": "manager1",
        "token": "abc12345678901234567890123456789",
        "is_active": True,
        "expires_at": None,
        "max_uses": None,
        "used_count": 0,
        "created_at": "2026-06-18T00:00:00+00:00",
        "updated_at": "2026-06-18T00:00:00+00:00",
        "last_used_at": None,
        "organizations": {"name": "Org 1"},
    }
    with patch_manager(make_session(user_id="manager1", is_manager=True), membership) as service:
        service.get_or_create_active_invite_link_for_manager = AsyncMock(return_value=invite_row)
        service.map_invite_link = lambda row, origin: {
            "id": "link1",
            "url": "http://testserver/moi/token",
            "organizationName": "Org 1",
        }
        response = await client.post("/api/manager/invite-links")
    assert response.status_code == 200
    assert response.json()["link"]["id"] == "link1"


@pytest.mark.asyncio
async def test_post_manager_invite_links_rotate_success(client):
    membership = make_manager_membership()
    invite_row = {
        "id": "link2",
        "organization_id": "org1",
        "created_by": "manager1",
        "token": "def12345678901234567890123456789",
        "is_active": True,
        "expires_at": None,
        "max_uses": None,
        "used_count": 0,
        "created_at": "2026-06-18T00:00:00+00:00",
        "updated_at": "2026-06-18T00:00:00+00:00",
        "last_used_at": None,
        "organizations": {"name": "Org 1"},
    }
    with patch_manager(make_session(user_id="manager1", is_manager=True), membership) as service:
        service.rotate_invite_link_for_manager = AsyncMock(return_value=invite_row)
        service.map_invite_link = lambda row, origin: {"id": "link2"}
        response = await client.post("/api/manager/invite-links/rotate")
    assert response.status_code == 200
    assert response.json()["link"]["id"] == "link2"


@pytest.mark.asyncio
async def test_get_manager_recommendations_success(client):
    membership = make_manager_membership()
    with patch_manager(make_session(user_id="manager1", is_manager=True), membership) as service:
        service.get_manager_recommendations = AsyncMock(
            return_value={
                "members": [{"userId": "u2", "hasSnapshot": True}],
                "persisted": True,
                "message": None,
            }
        )
        response = await client.get("/api/manager/recommendations")
    assert response.status_code == 200
    assert response.json()["members"][0]["userId"] == "u2"


@pytest.mark.asyncio
async def test_get_manager_agent_health_demo(client):
    membership = make_manager_membership(organization_id="demo", organization_name="Org Demo")
    with patch_manager(
        make_session(user_id="manager1", is_manager=True, mode="demo"),
        membership,
    ) as service:
        service.build_demo_agent_health_report = lambda m: {
            "generatedAt": "2026-06-18T00:00:00+00:00",
            "agents": [],
            "persisted": False,
            "organizationName": "Org Demo",
            "organizationId": "demo",
            "platform": {
                "supabaseConfigured": False,
                "openaiConfigured": False,
                "openaiModel": "gpt-4o-mini",
                "rateLimitPerDay": 30,
            },
        }
        response = await client.get("/api/manager/agent-health")
    assert response.status_code == 200
    assert response.json()["persisted"] is False


@pytest.mark.asyncio
async def test_get_manager_grading_demo(client):
    membership = make_manager_membership(organization_id="demo", organization_name="Org Demo")
    with patch_manager(
        make_session(user_id="manager1", is_manager=True, mode="demo"),
        membership,
    ) as service:
        service.get_demo_manager_grading_queue = lambda: {"items": [], "persisted": False}
        response = await client.get("/api/manager/grading")
    assert response.status_code == 200
    assert response.json()["persisted"] is False


@pytest.mark.asyncio
async def test_get_manager_grading_success(client):
    membership = make_manager_membership()
    with patch_manager(make_session(user_id="manager1", is_manager=True), membership) as service:
        service.get_manager_grading_queue = AsyncMock(
            return_value={"items": [{"id": "g1"}], "persisted": True, "message": None}
        )
        response = await client.get("/api/manager/grading")
    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == "g1"


@pytest.mark.asyncio
async def test_patch_manager_grading_review_demo(client):
    membership = make_manager_membership(organization_id="demo", organization_name="Org Demo")
    with patch_manager(
        make_session(user_id="manager1", is_manager=True, mode="demo"),
        membership,
    ):
        response = await client.patch(
            "/api/manager/grading/demo-grade-1/review",
            json={"action": "accept", "reason": "Ổn"},
        )
    assert response.status_code == 200
    assert response.json()["persisted"] is False


@pytest.mark.asyncio
async def test_patch_manager_grading_review_success(client):
    membership = make_manager_membership()
    with patch_manager(make_session(user_id="manager1", is_manager=True), membership) as service:
        service.resolve_manager_review_decision = lambda **kwargs: kwargs
        service.review_grading_result = AsyncMock(
            return_value={
                "resultId": "g1",
                "persisted": True,
                "reviewStatus": "auto-approved",
                "finalScore": 80,
                "message": "ok",
            }
        )
        response = await client.patch(
            "/api/manager/grading/g1/review",
            json={"action": "adjust", "adjustedScore": 80, "reason": "Điều chỉnh"},
        )
    assert response.status_code == 200
    assert response.json()["finalScore"] == 80
