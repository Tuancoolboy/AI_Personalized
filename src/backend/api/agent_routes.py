from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from backend.api.deps import api_error, api_ok, parse_json_body, require_session
from backend.services.agent_service import get_agent_service
from backend.services.openai_helpers import is_openai_configured

router = APIRouter(tags=["agents"])


def _map_value_error(exc: ValueError) -> HTTPException:
    message = str(exc)
    if message.startswith("VALIDATION:"):
        return api_error(400, "VALIDATION_ERROR", message.replace("VALIDATION:", "").strip())
    if message.startswith("FORBIDDEN:"):
        return api_error(403, "FORBIDDEN", message.replace("FORBIDDEN:", "").strip())
    if message.startswith("NOT_FOUND:"):
        return api_error(404, "NOT_FOUND", message.replace("NOT_FOUND:", "").strip())
    if message.startswith("INTERNAL:"):
        return api_error(500, "INTERNAL_ERROR", message.replace("INTERNAL:", "").strip())
    return api_error(500, "INTERNAL_ERROR", message)


@router.post("/api/aha")
async def post_aha(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    body = await parse_json_body(request)

    action = str(body.get("action") or "question")
    service = get_agent_service()

    if action == "question":
        insight = str(body.get("insight") or "").strip()
        if not insight:
            raise api_error(400, "VALIDATION_ERROR", "Thiếu nội dung phản tư.")
        question = await service.generate_aha_question(body)
        return api_ok(question=question)

    if action == "save":
        insight = str(body.get("insight") or "").strip()
        module_id = str(body.get("module_id") or "").strip()
        if not insight or not module_id:
            raise api_error(400, "VALIDATION_ERROR", "Thiếu dữ liệu phản tư.")
        try:
            result = await service.save_aha_reflection(session, body)
        except ValueError as exc:
            raise _map_value_error(exc)
        except Exception:
            raise api_error(500, "INTERNAL_ERROR", "Chưa lưu được phản tư.")
        return api_ok(**result)

    raise api_error(400, "VALIDATION_ERROR", "Hành động không hợp lệ.")


@router.post("/api/agent/lo-trinh")
async def post_agent_lo_trinh(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    try:
        body = await parse_json_body(request)
    except HTTPException:
        body = {}
    try:
        result = await get_agent_service().generate_learning_path(session, body)
    except ValueError as exc:
        raise _map_value_error(exc)
    except Exception:
        raise api_error(500, "INTERNAL_ERROR", "Không tạo được lộ trình. Thử lại sau.")
    return api_ok(**result)


@router.post("/api/agents/grader")
async def post_agents_grader(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    if not is_openai_configured():
        raise api_error(403, "FORBIDDEN", "Chưa cấu hình OPENAI_API_KEY.")
    body = await parse_json_body(request)
    try:
        result = await get_agent_service().grade_open_text(session, body)
    except ValueError as exc:
        raise _map_value_error(exc)
    except Exception:
        raise api_error(500, "INTERNAL_ERROR", "Agent 2 không chấm được bài tự luận.")
    return api_ok(**result)


@router.post("/api/agents/recommender")
async def post_agents_recommender(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    try:
        body = await parse_json_body(request)
    except HTTPException:
        body = {}
    result = await get_agent_service().recommend_modules(session, body)
    return api_ok(**result)
