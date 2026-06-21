from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request

from backend.services.native_app import get_native_app_service
from backend.services.types import NativeSession


def api_ok(**data: Any) -> dict[str, Any]:
    return {"ok": True, **data}


def api_error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


async def parse_json_body(request: Request) -> dict[str, Any]:
    try:
        body = await request.json()
    except Exception:
        raise api_error(400, "VALIDATION_ERROR", "JSON không hợp lệ.")
    if not isinstance(body, dict):
        raise api_error(400, "VALIDATION_ERROR", "JSON không hợp lệ.")
    return body


async def require_session(request: Request) -> NativeSession:
    session = await get_native_app_service().resolve_session(request)
    if not session:
        raise api_error(401, "UNAUTHORIZED", "Bạn cần đăng nhập.")
    return session


async def require_manager_context(request: Request) -> tuple[NativeSession, dict[str, Any]]:
    session = await require_session(request)
    membership = await get_native_app_service().get_manager_context(session.user_id)
    if not membership:
        raise api_error(403, "FORBIDDEN", "Chỉ quản lý mới xem được dữ liệu này.")
    return session, membership
