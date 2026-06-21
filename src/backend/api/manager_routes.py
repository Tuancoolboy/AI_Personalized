from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from backend.api.deps import api_error, api_ok, require_manager_context
from backend.services.native_app import get_native_app_service

router = APIRouter(tags=["manager"])


@router.get("/api/manager/team")
async def get_manager_team(request: Request) -> dict[str, Any]:
    session, membership = await require_manager_context(request)
    if membership["organizationId"] == "demo":
        return api_ok(
            members=[],
            total=0,
            organizationName=membership["organizationName"],
            persisted=False,
            message="Đang dùng dữ liệu demo/local.",
        )
    result = await get_native_app_service().load_organization_members(
        membership["organizationId"],
        membership["organizationName"],
        session.user_id,
    )
    return api_ok(**result)


@router.post("/api/manager/team")
async def post_manager_team(request: Request) -> dict[str, Any]:
    session, membership = await require_manager_context(request)
    body = await request.json()
    email = str(body.get("email") or "").strip().lower()
    grant_manager_access = body.get("grantManagerAccess") is True

    if session.mode == "demo":
        department_id = "khac"
        member = {
            "id": f"m-{int(datetime.now().timestamp() * 1000)}",
            "fullName": email.split("@")[0] if email else "Nhân viên mới",
            "email": email,
            "departmentId": department_id,
            "department": get_native_app_service().department_id_to_label(department_id),
            "memberRole": "manager" if grant_manager_access else "employee",
            "invitationStatus": "pending",
            "completionPct": 0,
            "quizScore": 0,
            "lastActivity": "Vừa thêm",
        }
        return api_ok(
            member=member,
            persisted=False,
            message=f"Đã thêm {member['fullName']} vào danh sách demo.",
        )

    try:
        result = await get_native_app_service().add_manager_team_member(
            viewer_user_id=session.user_id,
            organization_id=membership["organizationId"],
            organization_name=membership["organizationName"],
            email=email,
            grant_manager_access=grant_manager_access,
        )
    except ValueError as exc:
        message = str(exc)
        if message.startswith("VALIDATION:"):
            raise api_error(400, "VALIDATION_ERROR", message.replace("VALIDATION: ", ""))
        if message.startswith("NOT_FOUND:"):
            raise api_error(404, "NOT_FOUND", message.replace("NOT_FOUND: ", ""))
        if message.startswith("CONFLICT_ORG:"):
            _, payload = message.split(":", 1)
            org_id, org_name = (payload.split("|", 1) + [""])[:2]
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "CONFLICT",
                    "message": "Email này đã thuộc công ty khác. Một tài khoản chỉ được tham gia một công ty.",
                    "details": {
                        "organizationId": org_id or None,
                        "organizationName": org_name or None,
                    },
                },
            )
        raise
    return api_ok(**result)


@router.get("/api/manager/invite-links")
async def get_manager_invite_links(request: Request) -> dict[str, Any]:
    session, membership = await require_manager_context(request)
    if session.mode == "demo" or membership["organizationId"] == "demo":
        return api_ok(
            link=None,
            organizationName=membership["organizationName"],
            persisted=False,
            message="Link mời thật cần cấu hình Supabase.",
        )

    origin = str(request.base_url).rstrip("/")
    row = await get_native_app_service().get_active_invite_link_for_manager(
        membership["organizationId"],
        session.user_id,
    )
    return api_ok(
        link=get_native_app_service().map_invite_link(row, origin) if row else None,
        organizationName=membership["organizationName"],
        persisted=True,
    )


@router.post("/api/manager/invite-links")
async def post_manager_invite_links(request: Request) -> dict[str, Any]:
    session, membership = await require_manager_context(request)
    if session.mode == "demo" or membership["organizationId"] == "demo":
        return api_ok(
            link=None,
            organizationName=membership["organizationName"],
            persisted=False,
            message="Link mời thật cần cấu hình Supabase.",
        )

    origin = str(request.base_url).rstrip("/")
    row = await get_native_app_service().get_or_create_active_invite_link_for_manager(
        membership["organizationId"],
        session.user_id,
    )
    return api_ok(
        link=get_native_app_service().map_invite_link(row, origin),
        organizationName=membership["organizationName"],
        persisted=True,
        message="Đã sẵn sàng link mời cho nhân viên.",
    )


@router.post("/api/manager/invite-links/rotate")
async def post_manager_invite_links_rotate(request: Request) -> dict[str, Any]:
    session, membership = await require_manager_context(request)
    if session.mode == "demo" or membership["organizationId"] == "demo":
        raise api_error(500, "INTERNAL_ERROR", "Link mời thật cần cấu hình Supabase.")

    origin = str(request.base_url).rstrip("/")
    row = await get_native_app_service().rotate_invite_link_for_manager(
        membership["organizationId"],
        session.user_id,
    )
    return api_ok(
        link=get_native_app_service().map_invite_link(row, origin),
        organizationName=membership["organizationName"],
        persisted=True,
        message="Đã đổi token. Link cũ không còn hiệu lực.",
    )


@router.get("/api/manager/recommendations")
async def get_manager_recommendations(request: Request) -> dict[str, Any]:
    session, membership = await require_manager_context(request)
    if session.mode == "demo" or membership["organizationId"] == "demo":
        return api_ok(
            **get_native_app_service().get_demo_manager_recommendations(
                membership["organizationName"]
            )
        )
    result = await get_native_app_service().get_manager_recommendations(
        membership["organizationId"]
    )
    return api_ok(**result)


@router.get("/api/manager/agent-health")
async def get_manager_agent_health(request: Request) -> dict[str, Any]:
    session, membership = await require_manager_context(request)
    if session.mode == "demo" or membership["organizationId"] == "demo":
        return api_ok(**get_native_app_service().build_demo_agent_health_report(membership))
    report = await get_native_app_service().load_agent_health_report(membership)
    return api_ok(**report)


@router.get("/api/manager/grading")
async def get_manager_grading(request: Request) -> dict[str, Any]:
    session, membership = await require_manager_context(request)
    if session.mode == "demo" or membership["organizationId"] == "demo":
        return api_ok(**get_native_app_service().get_demo_manager_grading_queue())
    result = await get_native_app_service().get_manager_grading_queue(
        membership["organizationId"]
    )
    return api_ok(**result)


@router.patch("/api/manager/grading/{result_id}/review")
async def patch_manager_grading_review(
    request: Request,
    result_id: str,
) -> dict[str, Any]:
    session, membership = await require_manager_context(request)
    if not result_id.strip():
        raise api_error(400, "VALIDATION_ERROR", "Thiếu mã kết quả chấm điểm.")

    body = await request.json()
    action = str(body.get("action") or "").strip()
    if action not in {"accept", "adjust", "needs-revision"}:
        raise api_error(
            400,
            "VALIDATION_ERROR",
            "action phải là accept, adjust hoặc needs-revision.",
        )
    reason = str(body.get("reason") or "").strip()
    if not reason:
        raise api_error(400, "VALIDATION_ERROR", "Vui lòng nhập lý do duyệt.")

    adjusted_score = body.get("adjustedScore")
    if isinstance(adjusted_score, str) and adjusted_score.strip():
        try:
            adjusted_score = int(adjusted_score)
        except ValueError:
            adjusted_score = None
    elif isinstance(adjusted_score, float):
        adjusted_score = int(adjusted_score)
    elif not isinstance(adjusted_score, int):
        adjusted_score = None

    if action == "adjust" and (
        adjusted_score is None or adjusted_score < 0 or adjusted_score > 100
    ):
        raise api_error(
            400,
            "VALIDATION_ERROR",
            "Điều chỉnh điểm cần adjustedScore từ 0 đến 100.",
        )

    if session.mode == "demo" or membership["organizationId"] == "demo" or result_id.startswith("demo-"):
        decision = get_native_app_service().resolve_manager_review_decision(
            action,
            68,
            adjusted_score,
        )
        return api_ok(
            resultId=result_id,
            persisted=False,
            reviewStatus=decision["reviewStatus"],
            finalScore=decision["finalScore"],
            message="Demo — quyết định chưa lưu vào Supabase.",
        )

    try:
        result = await get_native_app_service().review_grading_result(
            organization_id=membership["organizationId"],
            reviewer_id=session.user_id,
            result_id=result_id.strip(),
            action=action,
            reason=reason,
            adjusted_score=adjusted_score,
        )
    except ValueError as exc:
        message = str(exc)
        if message.startswith("NOT_FOUND:"):
            raise api_error(404, "NOT_FOUND", message.replace("NOT_FOUND: ", ""))
        if message.startswith("CONFLICT:"):
            raise api_error(409, "CONFLICT", message.replace("CONFLICT: ", ""))
        raise
    return api_ok(**result)
