from unittest.mock import AsyncMock, patch

import pytest

from backend.tests.test_api.helpers import assert_api_error, make_session, patch_session


@pytest.mark.asyncio
async def test_post_aha_requires_auth(client):
    with patch_session(None):
        response = await client.post(
            "/api/aha",
            json={"action": "question", "insight": "AI giúp viết email nhanh hơn"},
        )
    assert_api_error(response, 401, "UNAUTHORIZED")


@pytest.mark.asyncio
async def test_post_aha_question(client):
    with patch_session(make_session()), patch(
        "backend.services.agent_service.AgentService.generate_aha_question",
        new=AsyncMock(return_value="Bạn sẽ thử việc này khi nào?"),
    ):
        response = await client.post(
            "/api/aha",
            json={"action": "question", "insight": "AI giúp viết email nhanh hơn"},
        )
    assert response.status_code == 200
    assert response.json()["question"] == "Bạn sẽ thử việc này khi nào?"


@pytest.mark.asyncio
async def test_post_aha_save_demo(client):
    with patch_session(make_session(mode="demo")), patch(
        "backend.services.agent_service.AgentService.save_aha_reflection",
        new=AsyncMock(return_value={"persisted": False}),
    ):
        response = await client.post(
            "/api/aha",
            json={
                "action": "save",
                "insight": "Hiểu cách viết prompt",
                "module_id": "marketing-m1",
            },
        )
    assert response.status_code == 200
    assert response.json()["persisted"] is False


@pytest.mark.asyncio
async def test_post_aha_requires_insight_for_question(client):
    with patch_session(make_session()):
        response = await client.post("/api/aha", json={"action": "question"})
    assert_api_error(response, 400, "VALIDATION_ERROR")


@pytest.mark.asyncio
async def test_post_agent_lo_trinh(client):
    with patch_session(make_session()), patch(
        "backend.services.agent_service.AgentService.generate_learning_path",
        new=AsyncMock(return_value={"path": {"summary": "ok"}, "cached": False}),
    ):
        response = await client.post("/api/agent/lo-trinh", json={"roleId": "marketing"})
    assert response.status_code == 200
    assert response.json()["path"]["summary"] == "ok"


@pytest.mark.asyncio
async def test_post_agents_grader_validates_answer_length(client):
    with patch_session(make_session()), patch(
        "backend.services.openai_helpers.is_openai_configured",
        return_value=True,
    ):
        response = await client.post(
            "/api/agents/grader",
            json={"answer": "ngắn", "prompt": "Mô tả cách dùng AI"},
        )
    assert_api_error(response, 400, "VALIDATION_ERROR")


@pytest.mark.asyncio
async def test_post_agents_grader_success(client):
    with patch_session(make_session()), patch(
        "backend.services.openai_helpers.is_openai_configured",
        return_value=True,
    ), patch(
        "backend.services.agent_service.AgentService.grade_open_text",
        new=AsyncMock(
            return_value={
                "result": {"score": 80},
                "gradingResultId": "g1",
                "gradingPersisted": True,
            }
        ),
    ):
        response = await client.post(
            "/api/agents/grader",
            json={
                "answer": "Em đã dùng AI để viết email chốt sale cho khách B2B.",
                "prompt": "Mô tả cách dùng AI",
            },
        )
    assert response.status_code == 200
    assert response.json()["result"]["score"] == 80


@pytest.mark.asyncio
async def test_post_agents_recommender(client):
    with patch_session(make_session()), patch(
        "backend.services.agent_service.AgentService.recommend_modules",
        new=AsyncMock(
            return_value={
                "engineVersion": "1.0.0",
                "roleId": "marketing",
                "aiLevel": 1,
                "managerPriorityModuleIds": [],
                "topRecommendation": None,
                "recommendations": [],
            }
        ),
    ):
        response = await client.post("/api/agents/recommender", json={"roleId": "marketing"})
    assert response.status_code == 200
    assert response.json()["engineVersion"] == "1.0.0"
