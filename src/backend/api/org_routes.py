from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from backend.api.deps import api_error, api_ok, require_session
from backend.services.native_app import get_native_app_service
from backend.services.organization_logic import build_company_entry_path

router = APIRouter(tags=["organization"])


@router.post("/api/organizations")
async def post_organizations(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    body = await request.json()
    name = str(body.get("name") or "").strip()
    slug = body.get("slug")
    slug = str(slug).strip() if isinstance(slug, str) else None
    if not name:
        raise api_error(400, "VALIDATION_ERROR", "Vui lòng nhập tên công ty.")
    try:
        organization = await get_native_app_service().create_organization_for_owner(
            user_id=session.user_id,
            name=name,
            slug=slug,
        )
    except ValueError as exc:
        message = str(exc)
        if message.startswith("CONFLICT:"):
            raise api_error(409, "CONFLICT", message.replace("CONFLICT: ", ""))
        if message.startswith("VALIDATION:"):
            raise api_error(400, "VALIDATION_ERROR", message.replace("VALIDATION: ", ""))
        raise
    return api_ok(
        organization=organization,
        entryPath=build_company_entry_path(organization["slug"]),
        message="Đã tạo công ty thành công.",
    )


@router.get("/api/organizations/current")
async def get_organizations_current(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    result = await get_native_app_service().get_current_organization(session.user_id)
    return api_ok(**result)


@router.patch("/api/organizations/current")
async def patch_organizations_current(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    body = await request.json()
    try:
        current = await get_native_app_service().get_current_organization(session.user_id)
        membership = current.get("membership")
        if not membership:
            raise api_error(404, "NOT_FOUND", "Bạn chưa thuộc công ty nào.")
        organization = await get_native_app_service().update_organization_for_owner(
            organization_id=membership["organizationId"],
            user_id=session.user_id,
            name=str(body["name"]) if isinstance(body.get("name"), str) else None,
            logo_url=(
                body["logoUrl"]
                if (
                    "logoUrl" in body
                    and (isinstance(body.get("logoUrl"), str) or body.get("logoUrl") is None)
                )
                else Ellipsis
            ),
            settings=body["settings"] if isinstance(body.get("settings"), dict) else None,
        )
    except HTTPException:
        raise
    except ValueError as exc:
        message = str(exc)
        if message.startswith("FORBIDDEN:"):
            raise api_error(403, "FORBIDDEN", message.replace("FORBIDDEN: ", ""))
        if message.startswith("VALIDATION:"):
            raise api_error(400, "VALIDATION_ERROR", message.replace("VALIDATION: ", ""))
        raise
    return api_ok(
        organization=organization,
        entryPath=build_company_entry_path(organization["slug"]),
        message="Đã cập nhật công ty.",
    )


@router.get("/api/organizations/{slug}/public")
async def get_organizations_public(slug: str) -> dict[str, Any]:
    organization = await get_native_app_service().get_public_organization_by_slug(slug)
    if not organization:
        raise api_error(404, "NOT_FOUND", "Không tìm thấy công ty.")
    return api_ok(organization=organization)


@router.post("/api/member/sync-department")
async def post_member_sync_department(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    profile = await get_native_app_service().get_profile(session.user_id)
    role_id = profile.get("roleId")
    if not role_id:
        return api_ok(updated=False, skippedReason="missing-role")
    result = await get_native_app_service().sync_member_department_for_user(
        session.user_id,
        str(role_id),
    )
    return api_ok(**result)


@router.get("/api/org-settings")
async def get_org_settings(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    if session.mode != "supabase":
        return api_ok(aiTool="claude", persisted=False)
    result = await get_native_app_service().get_org_ai_tool(session.user_id)
    return api_ok(**result)


@router.put("/api/org-settings")
async def put_org_settings(request: Request) -> dict[str, Any]:
    session = await require_session(request)
    body = await request.json()
    ai_tool = str(body.get("aiTool") or "").strip()

    if session.mode == "demo":
        if not get_native_app_service().is_primary_tool(ai_tool):
            raise api_error(400, "VALIDATION_ERROR", "Công cụ AI không hợp lệ.")
        return api_ok(aiTool=ai_tool, persisted=False)

    try:
        result = await get_native_app_service().update_org_ai_tool(
            session.user_id,
            ai_tool,
        )
    except ValueError as exc:
        message = str(exc)
        if message.startswith("FORBIDDEN:"):
            raise api_error(403, "FORBIDDEN", message.replace("FORBIDDEN: ", ""))
        if message.startswith("VALIDATION:"):
            raise api_error(400, "VALIDATION_ERROR", message.replace("VALIDATION: ", ""))
        raise
    return api_ok(**result)
