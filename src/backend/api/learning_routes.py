from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from backend.api.deps import api_error, api_ok, parse_json_body, require_session
from backend.services.constants import VALID_ROLES
from backend.services.native_app import get_native_app_service
from backend.services.practice_service import get_practice_service

router = APIRouter(tags=["learning"])


@router.get("/api/modules")
async def get_modules(request: Request) -> dict[str, Any]:
    role_id = str(request.query_params.get("role_id") or "").strip()
    if not role_id or role_id not in VALID_ROLES:
        raise api_error(400, "VALIDATION_ERROR", "role_id không hợp lệ.")
    try:
        ai_level = int(request.query_params.get("ai_level") or "0")
    except ValueError:
        ai_level = 0
    modules = await get_native_app_service().fetch_modules_for_role(role_id, ai_level)
    return api_ok(modules=modules, source="learning_modules")


@router.get("/api/modules/{module_id}")
async def get_module(module_id: str) -> dict[str, Any]:
    module = await get_native_app_service().fetch_module_by_id(module_id)
    if not module:
        raise api_error(404, "NOT_FOUND", "Không tìm thấy bài học.")
    return api_ok(module=module)


@router.get("/api/quiz-results")
async def get_quiz_results(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    result = await get_native_app_service().get_quiz_results(session.user_id)
    return api_ok(**result)


@router.post("/api/quiz-results")
async def post_quiz_results(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    body = await request.json()
    role_id = str(body.get("roleId") or "").strip()
    if not role_id or role_id not in VALID_ROLES:
        raise api_error(400, "VALIDATION_ERROR", "Vai trò không hợp lệ.")
    module_id = body.get("moduleId")
    module_id = str(module_id).strip() if isinstance(module_id, str) else None
    answers = body.get("answers")
    if isinstance(answers, list):
        parsed_answers: list[int] = []
        for item in answers:
            if not isinstance(item, int) or item < 0:
                raise api_error(400, "VALIDATION_ERROR", "Số câu trả lời không khớp bài kiểm tra.")
            parsed_answers.append(item)
        graded = get_native_app_service().grade_mcq_quiz(role_id, parsed_answers)
        if not graded:
            raise api_error(400, "VALIDATION_ERROR", "Số câu trả lời không khớp bài kiểm tra.")
        await get_native_app_service().create_quiz_result(
            session.user_id, role_id=role_id, module_id=module_id, score=graded["score"]
        )
        return api_ok(**graded)

    raw_score = body.get("score")
    try:
        score = int(raw_score)
    except (TypeError, ValueError):
        raise api_error(400, "VALIDATION_ERROR", "Điểm phải từ 0 đến 100.")
    if score < 0 or score > 100:
        raise api_error(400, "VALIDATION_ERROR", "Điểm phải từ 0 đến 100.")
    result = await get_native_app_service().create_quiz_result(
        session.user_id, role_id=role_id, module_id=module_id, score=score
    )
    return api_ok(**result)


@router.get("/api/practice-review")
async def get_practice_review(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    if session.mode != "supabase":
        raise api_error(403, "FORBIDDEN", "API practice-review cần Supabase.")
    module_id = str(request.query_params.get("moduleId") or "").strip()
    if not module_id:
        raise api_error(400, "VALIDATION_ERROR", "Thiếu moduleId.")
    try:
        result = await get_practice_service().get_practice_history(session.user_id, module_id)
    except Exception:
        raise api_error(500, "INTERNAL_ERROR", "Không đọc được lịch sử chấm.")
    return api_ok(**result)


@router.post("/api/practice-review")
async def post_practice_review(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    body = await parse_json_body(request)
    try:
        result = await get_practice_service().submit_practice(session, body)
    except ValueError as exc:
        message = str(exc)
        if message.startswith("VALIDATION:"):
            raise api_error(400, "VALIDATION_ERROR", message.replace("VALIDATION:", ""))
        if message.startswith("NOT_FOUND:"):
            raise api_error(404, "NOT_FOUND", message.replace("NOT_FOUND:", ""))
        raise
    return api_ok(**result)
