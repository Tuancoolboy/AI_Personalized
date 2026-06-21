from unittest.mock import AsyncMock, patch

import pytest

from backend.tests.test_api.helpers import assert_api_error, make_session, patch_session


@pytest.mark.asyncio
async def test_get_chat_history_demo_mode(client):
    with patch_session(make_session(mode="demo")):
        response = await client.get("/api/chat/history")
    assert response.status_code == 200
    assert response.json()["messages"] == []


@pytest.mark.asyncio
async def test_get_chat_history_success(client):
    with patch_session(make_session()) as service:
        service.resolve_chat_audience = lambda is_manager: "employee"
        service.load_chat_history = AsyncMock(
            return_value={
                "conversationId": "c1",
                "coreContext": "ctx",
                "resumeLesson": None,
                "messages": [
                    {
                        "id": "m1",
                        "role": "user",
                        "content": "Hi",
                        "createdAt": "2026-06-18T00:00:00+00:00",
                    }
                ],
            }
        )
        response = await client.get("/api/chat/history")
    assert response.status_code == 200
    assert response.json()["conversationId"] == "c1"


@pytest.mark.asyncio
async def test_get_chat_conversations_success(client):
    with patch_session(make_session(is_manager=True)) as service:
        service.resolve_chat_audience = lambda is_manager: "manager"
        service.list_chat_conversations = AsyncMock(
            return_value=[
                {
                    "id": "c1",
                    "title": "Hoi thoai 1",
                    "updatedAt": "2026-06-18T00:00:00+00:00",
                    "createdAt": "2026-06-18T00:00:00+00:00",
                }
            ]
        )
        response = await client.get("/api/chat/conversations")
    assert response.status_code == 200
    assert response.json()["conversations"][0]["id"] == "c1"


@pytest.mark.asyncio
async def test_delete_chat_conversation_success(client):
    with patch_session(make_session()) as service:
        service.delete_chat_conversation = AsyncMock(return_value=True)
        response = await client.delete("/api/chat/conversations/c1")
    assert response.status_code == 200
    assert response.json()["deleted"] is True


@pytest.mark.asyncio
async def test_delete_chat_conversation_not_found(client):
    with patch_session(make_session()) as service:
        service.delete_chat_conversation = AsyncMock(return_value=False)
        response = await client.delete("/api/chat/conversations/c1")
    assert_api_error(response, 404, "NOT_FOUND")


@pytest.mark.asyncio
async def test_post_chat_requires_auth(client):
    with patch_session(None):
        response = await client.post("/api/chat", json={"message": "xin chao"})
    assert_api_error(response, 401, "UNAUTHORIZED")


@pytest.mark.asyncio
async def test_post_chat_rate_limit(client):
    with patch_session(make_session()), patch(
        "backend.services.chat_ai_service.ChatAiService.stream_chat",
        new=AsyncMock(
            side_effect=ValueError(
                "RATE_LIMIT:Hết lượt hôm nay.|2026-06-19T00:00:00+00:00|30|30"
            )
        ),
    ):
        response = await client.post(
            "/api/chat",
            json={"message": "xin chao", "role_id": "marketing"},
            headers={"Authorization": "Bearer test"},
        )
    assert response.status_code == 429
    assert response.json()["code"] == "RATE_LIMIT_EXCEEDED"


@pytest.mark.asyncio
async def test_post_chat_validation_missing_role(client):
    with patch_session(make_session()), patch(
        "backend.services.chat_ai_service.ChatAiService.stream_chat",
        new=AsyncMock(
            side_effect=ValueError(
                "VALIDATION:Chưa chọn vai trò. Hoàn thành onboarding trước."
            )
        ),
    ):
        response = await client.post(
            "/api/chat",
            json={"message": "xin chao"},
            headers={"Authorization": "Bearer test"},
        )
    assert_api_error(response, 400, "VALIDATION_ERROR")


@pytest.mark.asyncio
async def test_post_chat_streams_when_authenticated(client):
    async def fake_stream():
        yield "Xin chao"

    with patch_session(make_session(mode="demo")), patch(
        "backend.services.chat_ai_service.ChatAiService.stream_chat",
        new=AsyncMock(return_value=(fake_stream, {"X-Chat-Mode": "demo-openai"})),
    ):
        response = await client.post(
            "/api/chat",
            json={"message": "xin chao", "role_id": "marketing"},
            headers={"Authorization": "Bearer test"},
        )

    assert response.status_code == 200
    assert "Xin chao" in response.text
