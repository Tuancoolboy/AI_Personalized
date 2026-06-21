from unittest.mock import AsyncMock

import pytest

from backend.tests.test_api.helpers import assert_api_error, make_session, patch_session


@pytest.mark.asyncio
async def test_get_profile_requires_auth(client):
    with patch_session(None):
        response = await client.get("/api/profile")
    assert_api_error(response, 401, "UNAUTHORIZED")


@pytest.mark.asyncio
async def test_get_profile_success(client):
    with patch_session(make_session()) as service:
        service.get_profile = AsyncMock(
            return_value={
                "roleId": "marketing",
                "fullName": "Hai",
                "email": "a@test.com",
                "phoneNumber": None,
                "aiLevel": 2,
            }
        )
        response = await client.get("/api/profile")
    assert response.status_code == 200
    assert response.json()["roleId"] == "marketing"


@pytest.mark.asyncio
async def test_put_profile_rejects_invalid_role(client):
    with patch_session(make_session()):
        response = await client.put("/api/profile", json={"roleId": "invalid-role"})
    assert_api_error(response, 400, "VALIDATION_ERROR")


@pytest.mark.asyncio
async def test_put_profile_success(client):
    with patch_session(make_session()) as service:
        service.update_profile = AsyncMock(return_value={"roleId": "marketing", "fullName": "Hai"})
        response = await client.put("/api/profile", json={"fullName": "Hai Nguyen"})
    assert response.status_code == 200
    assert response.json()["fullName"] == "Hai"


@pytest.mark.asyncio
async def test_post_event_rejects_invalid_event_name(client):
    with patch_session(make_session()):
        response = await client.post("/api/events", json={"eventName": "not-real"})
    assert_api_error(response, 400, "VALIDATION_ERROR")


@pytest.mark.asyncio
async def test_post_event_success(client):
    with patch_session(make_session()) as service:
        service.record_event = AsyncMock(return_value={"persisted": True})
        response = await client.post(
            "/api/events",
            json={"eventName": "lesson_view", "properties": {"moduleId": "m1"}},
        )
    assert response.status_code == 200
    assert response.json()["persisted"] is True


@pytest.mark.asyncio
async def test_get_progress_success(client):
    with patch_session(make_session()) as service:
        service.get_progress = AsyncMock(return_value={"marketing-m1": "dang-hoc"})
        response = await client.get("/api/progress")
    assert response.status_code == 200
    assert response.json()["progress"]["marketing-m1"] == "dang-hoc"


@pytest.mark.asyncio
async def test_post_progress_validates_status(client):
    with patch_session(make_session()):
        response = await client.post("/api/progress", json={"moduleId": "m1", "status": "sai"})
    assert_api_error(response, 400, "VALIDATION_ERROR")


@pytest.mark.asyncio
async def test_post_progress_success(client):
    with patch_session(make_session()) as service:
        service.save_progress = AsyncMock(return_value={"marketing-m1": "hoan-thanh"})
        response = await client.post(
            "/api/progress",
            json={"moduleId": "marketing-m1", "status": "hoan-thanh"},
        )
    assert response.status_code == 200
    assert response.json()["progress"]["marketing-m1"] == "hoan-thanh"


@pytest.mark.asyncio
async def test_get_nhat_ky_success(client):
    with patch_session(make_session()) as service:
        service.get_time_logs = AsyncMock(return_value={"logs": [], "totalHours": 0})
        response = await client.get("/api/nhat-ky")
    assert response.status_code == 200
    assert response.json()["totalHours"] == 0


@pytest.mark.asyncio
async def test_post_nhat_ky_rejects_invalid_hours(client):
    with patch_session(make_session()):
        response = await client.post("/api/nhat-ky", json={"hoursSaved": 0})
    assert_api_error(response, 400, "VALIDATION_ERROR")


@pytest.mark.asyncio
async def test_post_nhat_ky_success(client):
    with patch_session(make_session()) as service:
        service.create_time_log = AsyncMock(return_value={"logs": [], "totalHours": 2})
        response = await client.post(
            "/api/nhat-ky",
            json={"hoursSaved": 2, "usefulness": 8, "note": "AI giúp viết email"},
        )
    assert response.status_code == 200
    assert response.json()["totalHours"] == 2
