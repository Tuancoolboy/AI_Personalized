from unittest.mock import AsyncMock, patch

import pytest

from backend.tests.test_api.helpers import (
    assert_api_error,
    make_session,
    patch_service,
    patch_session,
)


@pytest.mark.asyncio
async def test_get_modules_rejects_invalid_role(client):
    response = await client.get("/api/modules?role_id=invalid")
    assert_api_error(response, 400, "VALIDATION_ERROR")


@pytest.mark.asyncio
async def test_get_modules_success(client):
    with patch_service() as service:
        service.fetch_modules_for_role = AsyncMock(
            return_value=[{"id": "marketing-m1", "title": "Bai 1"}]
        )
        response = await client.get("/api/modules?role_id=marketing&ai_level=2")
    assert response.status_code == 200
    assert response.json()["modules"][0]["id"] == "marketing-m1"


@pytest.mark.asyncio
async def test_get_module_not_found(client):
    with patch_service() as service:
        service.fetch_module_by_id = AsyncMock(return_value=None)
        response = await client.get("/api/modules/unknown-module")
    assert_api_error(response, 404, "NOT_FOUND")


@pytest.mark.asyncio
async def test_get_module_success(client):
    with patch_service() as service:
        service.fetch_module_by_id = AsyncMock(
            return_value={"id": "marketing-m1", "title": "Bai 1"}
        )
        response = await client.get("/api/modules/marketing-m1")
    assert response.status_code == 200
    assert response.json()["module"]["id"] == "marketing-m1"


@pytest.mark.asyncio
async def test_get_quiz_results_requires_auth(client):
    with patch_session(None):
        response = await client.get("/api/quiz-results")
    assert_api_error(response, 401, "UNAUTHORIZED")


@pytest.mark.asyncio
async def test_get_quiz_results_success(client):
    with patch_session(make_session()) as service:
        service.get_quiz_results = AsyncMock(return_value={"results": [], "averageScore": 0, "bestScore": 0})
        response = await client.get("/api/quiz-results")
    assert response.status_code == 200
    assert response.json()["averageScore"] == 0


@pytest.mark.asyncio
async def test_post_quiz_results_with_answers(client):
    with patch_session(make_session()) as service:
        service.grade_mcq_quiz = lambda role_id, answers: {
            "score": 80,
            "correctCount": 4,
            "questionCount": 5,
            "reviewStatus": "auto-approved",
            "gradingResultId": None,
            "gradingPersisted": False,
            "passed": True,
        }
        service.create_quiz_result = AsyncMock(return_value={"score": 80, "passed": True})
        response = await client.post(
            "/api/quiz-results",
            json={"roleId": "marketing", "answers": [0, 1, 2, 3, 0]},
        )
    assert response.status_code == 200
    assert response.json()["score"] == 80


@pytest.mark.asyncio
async def test_get_practice_review_requires_supabase(client):
    with patch_session(make_session(mode="demo")):
        response = await client.get("/api/practice-review?moduleId=marketing-m1")
    assert_api_error(response, 403, "FORBIDDEN")


@pytest.mark.asyncio
async def test_get_practice_review_missing_module_id(client):
    with patch_session(make_session()):
        response = await client.get("/api/practice-review")
    assert_api_error(response, 400, "VALIDATION_ERROR")


@pytest.mark.asyncio
async def test_get_practice_review_success(client):
    with patch_session(make_session()), patch(
        "backend.services.practice_service.PracticeService.get_practice_history",
        new=AsyncMock(
            return_value={
                "review": None,
                "history": [],
                "stats": {"attemptCount": 0, "bestScore": 0, "latestScore": None},
            }
        ),
    ):
        response = await client.get("/api/practice-review?moduleId=marketing-m1")
    assert response.status_code == 200
    assert response.json()["stats"]["attemptCount"] == 0


@pytest.mark.asyncio
async def test_post_practice_review_success(client):
    with patch_session(make_session()), patch(
        "backend.services.practice_service.PracticeService.submit_practice",
        new=AsyncMock(return_value={"review": {"score": 75}, "entry": {"score": 75}}),
    ):
        response = await client.post(
            "/api/practice-review",
            json={"moduleId": "marketing-m1", "answerText": "Em đã thử prompt theo bài học."},
        )
    assert response.status_code == 200
    assert response.json()["review"]["score"] == 75
