from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from backend.api.deps import api_error, api_ok, parse_json_body, require_session
from backend.services.constants import ALLOWED_EVENTS, VALID_PROGRESS_STATUS, VALID_ROLES
from backend.services.native_app import get_native_app_service

router = APIRouter(tags=["user"])


@router.post("/api/events")
async def post_event(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    body = await parse_json_body(request)
    event_name = str(body.get("eventName") or "").strip()
    if not event_name or event_name not in ALLOWED_EVENTS:
        raise api_error(400, "VALIDATION_ERROR", "Tên sự kiện không hợp lệ.")
    properties = body.get("properties")
    if not isinstance(properties, dict):
        properties = {}
    result = await get_native_app_service().record_event(session.user_id, event_name, properties)
    return api_ok(**result)


@router.get("/api/profile")
async def get_profile(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    profile = await get_native_app_service().get_profile(session.user_id)
    return api_ok(**profile)


@router.put("/api/profile")
async def put_profile(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    body = await parse_json_body(request)
    role_id = body.get("roleId")
    if role_id is not None:
        role_id = str(role_id).strip()
        if not role_id or role_id not in VALID_ROLES:
            raise api_error(400, "VALIDATION_ERROR", "Vai trò không hợp lệ.")
    payload: dict[str, Any] = {}
    if role_id is not None:
        payload["role_id"] = role_id
    full_name = body.get("fullName")
    if full_name is not None:
        full_name = str(full_name).strip()
        if len(full_name) < 2:
            raise api_error(400, "VALIDATION_ERROR", "Họ tên không hợp lệ.")
        payload["full_name"] = full_name
    phone_number = body.get("phoneNumber")
    if phone_number is not None:
        phone = str(phone_number).strip().replace(" ", "").replace("-", "")
        payload["phone_number"] = phone or None
    ai_level = body.get("aiLevel")
    if ai_level is not None:
        try:
            ai_level = int(ai_level)
        except (TypeError, ValueError):
            raise api_error(400, "VALIDATION_ERROR", "Cấp độ AI không hợp lệ.")
        if ai_level < 0 or ai_level > 5:
            raise api_error(400, "VALIDATION_ERROR", "Cấp độ AI không hợp lệ.")
        payload["ai_level"] = ai_level
    if not payload:
        raise api_error(400, "VALIDATION_ERROR", "Không có thông tin cần cập nhật.")
    profile = await get_native_app_service().update_profile(session.user_id, payload)
    return api_ok(**profile)


@router.get("/api/progress")
async def get_progress(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    progress = await get_native_app_service().get_progress(session.user_id)
    return api_ok(progress=progress)


@router.post("/api/progress")
async def post_progress(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    body = await parse_json_body(request)
    module_id = str(body.get("moduleId") or "").strip()
    status = str(body.get("status") or "").strip()
    if not module_id:
        raise api_error(400, "VALIDATION_ERROR", "Thiếu moduleId.")
    if status not in VALID_PROGRESS_STATUS:
        raise api_error(400, "VALIDATION_ERROR", "Trạng thái không hợp lệ.")
    progress = await get_native_app_service().save_progress(session.user_id, module_id, status)
    return api_ok(progress=progress)


@router.get("/api/nhat-ky")
async def get_logs(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    result = await get_native_app_service().get_time_logs(session.user_id)
    return api_ok(**result)


@router.post("/api/nhat-ky")
async def post_logs(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    body = await parse_json_body(request)
    try:
        hours_saved = float(body.get("hoursSaved"))
    except (TypeError, ValueError):
        raise api_error(400, "VALIDATION_ERROR", "Số giờ không hợp lệ.")
    if hours_saved <= 0 or hours_saved > 24:
        raise api_error(400, "VALIDATION_ERROR", "Số giờ phải lớn hơn 0 và không quá 24.")
    usefulness = body.get("usefulness")
    if usefulness is not None:
        try:
            usefulness = int(usefulness)
        except (TypeError, ValueError):
            raise api_error(400, "VALIDATION_ERROR", "Mức hữu ích phải từ 1 đến 10.")
        if usefulness < 1 or usefulness > 10:
            raise api_error(400, "VALIDATION_ERROR", "Mức hữu ích phải từ 1 đến 10.")
    note = body.get("note")
    if note is not None:
        note = str(note).strip() or None
    result = await get_native_app_service().create_time_log(
        session.user_id,
        hours_saved=hours_saved,
        usefulness=usefulness,
        note=note,
    )
    return api_ok(**result)
