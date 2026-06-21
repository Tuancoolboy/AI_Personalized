from __future__ import annotations

from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from backend.api.deps import api_error, api_ok, parse_json_body, require_session
from backend.services.constants import EMAIL_REGEX
from backend.services.invite_service import build_invite_path, get_invite_service
from backend.services.native_app import get_native_app_service
from backend.services.supabase_gateway import get_supabase_gateway

router = APIRouter(tags=["public"])


@router.post("/api/leads")
async def post_lead(request: Request) -> dict[str, Any]:
    body = await parse_json_body(request)
    email = str(body.get("email") or "").strip()
    if not email or not EMAIL_REGEX.match(email):
        raise api_error(400, "VALIDATION_ERROR", "Email không hợp lệ.")
    name = str(body.get("name") or "").strip() or None
    source = str(body.get("source") or "landing").strip() or "landing"
    result = await get_native_app_service().create_lead(email, name, source)
    return result


@router.get("/api/leads")
async def get_leads(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    if not session.is_manager:
        raise api_error(403, "FORBIDDEN", "Chỉ quản lý mới xem được danh sách đăng ký.")
    result = await get_native_app_service().list_leads()
    return api_ok(**result)


def _redirect(request: Request, path: str) -> RedirectResponse:
    base = str(request.base_url).rstrip("/")
    return RedirectResponse(url=f"{base}{path}", status_code=302)


@router.get("/moi/{token}/accept")
async def get_invite_accept(request: Request, token: str):
    invite_path = build_invite_path(token)
    gateway = get_supabase_gateway()
    if not gateway.is_configured():
        return _redirect(request, invite_path)

    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return _redirect(request, f"/login?next={quote(invite_path)}")

    user = await gateway.auth_user(auth_header[7:].strip())
    if not user:
        return _redirect(request, f"/login?next={quote(invite_path)}")
    return _redirect(request, invite_path)


@router.post("/moi/{token}/accept")
async def post_invite_accept(request: Request, token: str):
    invite_path = build_invite_path(token)
    gateway = get_supabase_gateway()
    if not gateway.is_configured():
        return _redirect(request, invite_path)

    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return _redirect(request, f"/login?next={quote(invite_path)}")

    user = await gateway.auth_user(auth_header[7:].strip())
    if not user:
        return _redirect(request, f"/login?next={quote(invite_path)}")

    result = await get_invite_service().accept_organization_invite(
        token=token,
        user_id=user.id,
        user_email=user.email,
    )
    if not result.get("ok"):
        error = result.get("error", "accept")
        return _redirect(request, f"{invite_path}?error={error}")
    return _redirect(request, str(result["redirectPath"]))
