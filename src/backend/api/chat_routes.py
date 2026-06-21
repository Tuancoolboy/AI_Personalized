from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

from backend.api.deps import api_error, api_ok, parse_json_body, require_session
from backend.services.chat_ai_service import get_chat_ai_service
from backend.services.native_app import get_native_app_service

router = APIRouter(tags=["chat"])


@router.get("/api/chat/history")
async def get_chat_history(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    audience = get_native_app_service().resolve_chat_audience(session.is_manager)
    draft = request.query_params.get("draft") == "1"
    conversation_id = str(request.query_params.get("conversation_id") or "").strip() or None

    if session.mode != "supabase":
        return api_ok(
            conversationId=None,
            coreContext=None,
            resumeLesson=None,
            messages=[],
        )

    result = await get_native_app_service().load_chat_history(
        session.user_id,
        audience,
        conversation_id,
        draft=draft,
    )
    return api_ok(**result)


@router.get("/api/chat/conversations")
async def get_chat_conversations(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    if session.mode != "supabase":
        return api_ok(conversations=[])
    audience = get_native_app_service().resolve_chat_audience(session.is_manager)
    conversations = await get_native_app_service().list_chat_conversations(
        session.user_id,
        audience,
    )
    return api_ok(conversations=conversations)


@router.delete("/api/chat/conversations/{conversation_id}")
async def delete_chat_conversation(request: Request, conversation_id: str) -> dict[str, Any]:
    session = await require_session(request)
    if session.mode != "supabase":
        raise api_error(404, "NOT_FOUND", "Không tìm thấy hội thoại.")
    if not conversation_id.strip():
        raise api_error(400, "VALIDATION_ERROR", "Thiếu id hội thoại.")
    deleted = await get_native_app_service().delete_chat_conversation(
        session.user_id,
        conversation_id.strip(),
    )
    if not deleted:
        raise api_error(404, "NOT_FOUND", "Không tìm thấy hội thoại.")
    return api_ok(deleted=True)


@router.post("/api/chat")
async def post_chat(request: Request):
    session = await require_session(request)
    body = await parse_json_body(request)
    try:
        stream_factory, headers = await get_chat_ai_service().stream_chat(session, body)
    except ValueError as exc:
        message = str(exc)
        if message.startswith("RATE_LIMIT:"):
            parts = message.split("|", 3)
            detail: dict[str, Any] = {"code": "RATE_LIMIT_EXCEEDED", "message": parts[0].replace("RATE_LIMIT:", "")}
            if len(parts) > 1:
                detail["resetAt"] = parts[1]
            if len(parts) > 3:
                detail["used"] = int(parts[2])
                detail["limit"] = int(parts[3])
            return JSONResponse(status_code=429, content={"ok": False, **detail}, headers={"Retry-After": "86400"})
        if message.startswith("VALIDATION:"):
            raise api_error(400, "VALIDATION_ERROR", message.replace("VALIDATION:", ""))
        raise

    return StreamingResponse(stream_factory(), headers=headers, media_type="text/plain; charset=utf-8")
