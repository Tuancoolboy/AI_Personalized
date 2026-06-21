from __future__ import annotations

from datetime import UTC, datetime
import os
import secrets
from typing import Any
from uuid import uuid4

from backend.services.constants import (
    DEFAULT_ORGANIZATION_NAME,
    DEMO_MANAGER_GRADING_QUEUE,
    DEMO_MANAGER_RECOMMENDATIONS,
    EMAIL_REGEX,
    INVITE_TOKEN_PATTERN,
    MODULE_COUNT_PER_ROLE,
    REASON_CODE_LABELS,
    RECOMMENDER_ENGINE_VERSION,
    SINGLE_ORGANIZATION_CONFLICT_MESSAGE,
)
from backend.services.learning_data import get_module_by_id
from backend.services.organization_logic import build_company_entry_path
from backend.services.service_base import ServiceBase

class ManagerService(ServiceBase):
        def relative_day_label(self, value: str | None) -> str:
            if not value:
                return ""
            then = datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
            diff_days = max(0, int((datetime.now(UTC).timestamp() - then) // (24 * 60 * 60)))
            if diff_days == 0:
                return "Hôm nay"
            if diff_days == 1:
                return "Hôm qua"
            return f"{diff_days} ngày trước"

        def relative_time_label(self, value: str | None) -> str:
            if not value:
                return "Chưa có"
            then = datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
            diff_hours = max(0, int((datetime.now(UTC).timestamp() - then) // (60 * 60)))
            if diff_hours < 1:
                return "Vừa xong"
            if diff_hours < 24:
                return f"{diff_hours} giờ trước"
            if diff_hours < 48:
                return "Hôm qua"
            return f"{diff_hours // 24} ngày trước"

        def is_openai_configured(self) -> bool:
            return bool(os.getenv("OPENAI_API_KEY", "").strip())

        def get_openai_model(self) -> str:
            return os.getenv("OPENAI_MODEL", "").strip() or "gpt-4o-mini"

        def get_rate_limit_per_day(self) -> int:
            raw = os.getenv("RATE_LIMIT_PER_DAY", "").strip()
            try:
                value = int(raw)
            except ValueError:
                value = 30
            return value if value > 0 else 30

        def resolve_agent_status(
            self,
            *,
            runtime_mode: str,
            calls_last_7_days: int,
            calls_last_30_days: int,
            unavailable: bool = False,
            issues: list[str] | None = None,
        ) -> str:
            if unavailable:
                return "unavailable"
            if calls_last_30_days == 0:
                return "inactive"
            if runtime_mode != "live" or calls_last_7_days == 0 or (issues or []):
                return "degraded"
            return "healthy"

        def is_missing_grading_schema(self, message: str) -> bool:
            return bool(re.search(r"grading_results|does not exist", message, re.IGNORECASE))

        def resolve_manager_review_decision(
            self,
            action: str,
            current_score: int,
            adjusted_score: int | None = None,
        ) -> dict[str, Any]:
            if action == "accept":
                return {"reviewStatus": "auto-approved", "finalScore": current_score}
            if action == "needs-revision":
                return {"reviewStatus": "needs-revision", "finalScore": current_score}
            next_score = current_score
            if adjusted_score is not None:
                next_score = min(100, max(0, round(adjusted_score)))
            return {"reviewStatus": "auto-approved", "finalScore": next_score}

        def map_grading_row_to_queue_item(
            self,
            row: dict[str, Any],
            module_title: str | None = None,
        ) -> dict[str, Any]:
            submission = row.get("assessment_submissions")
            if isinstance(submission, list):
                submission = submission[0] if submission else None
            module_id = (
                str(submission.get("legacy_module_id"))
                if isinstance(submission, dict) and submission.get("legacy_module_id")
                else None
            )
            profiles = row.get("profiles")
            if isinstance(profiles, list):
                profiles = profiles[0] if profiles else None
            employee_name = (
                str(profiles.get("full_name")).strip()
                if isinstance(profiles, dict) and profiles.get("full_name")
                else None
            )
            return {
                "id": str(row["id"]),
                "userId": str(row["user_id"]),
                "employeeName": employee_name,
                "moduleId": module_id,
                "moduleTitle": module_title,
                "score": int(row.get("score") or 0),
                "confidence": float(row.get("confidence") or 0),
                "reviewStatus": str(row.get("review_status") or "manager-review"),
                "feedback": str(row.get("feedback") or ""),
                "rubricBreakdown": list(row.get("rubric_breakdown") or []),
                "evidence": list(row.get("evidence") or []),
                "strengths": list(row.get("strengths") or []),
                "improvements": list(row.get("improvements") or []),
                "submittedAt": row.get("created_at"),
                "model": row.get("model"),
            }

        def generate_invite_token(self) -> str:
            return secrets.token_urlsafe(32)

        def is_invite_token_shape(self, token: str) -> bool:
            return bool(INVITE_TOKEN_PATTERN.match(token))

        def build_invite_path(self, token: str) -> str:
            from urllib.parse import quote
    
            return f"/moi/{quote(token)}"

        def build_invite_url(self, origin: str, token: str) -> str:
            return f"{origin.rstrip('/')}{self.build_invite_path(token)}"

        def invite_link_expired(self, row: dict[str, Any]) -> bool:
            expires_at = row.get("expires_at")
            if not expires_at:
                return False
            return datetime.fromisoformat(str(expires_at).replace("Z", "+00:00")) <= datetime.now(UTC)

        def invite_link_exhausted(self, row: dict[str, Any]) -> bool:
            max_uses = row.get("max_uses")
            used_count = row.get("used_count") or 0
            return max_uses is not None and int(used_count) >= int(max_uses)

        def invite_link_usable(self, row: dict[str, Any]) -> bool:
            return bool(row.get("is_active")) and not self.invite_link_expired(row) and not self.invite_link_exhausted(row)

        def invite_organization_name(self, row: dict[str, Any]) -> str:
            return self.organization_name_of(row)

        def map_invite_link(self, row: dict[str, Any], origin: str) -> dict[str, Any]:
            return {
                "id": row["id"],
                "organizationId": row["organization_id"],
                "organizationName": self.invite_organization_name(row),
                "createdBy": row["created_by"],
                "token": row["token"],
                "url": self.build_invite_url(origin, row["token"]),
                "isActive": row["is_active"],
                "expiresAt": row.get("expires_at"),
                "maxUses": row.get("max_uses"),
                "usedCount": row.get("used_count") or 0,
                "isExpired": self.invite_link_expired(row),
                "isExhausted": self.invite_link_exhausted(row),
                "createdAt": row["created_at"],
                "updatedAt": row["updated_at"],
                "lastUsedAt": row.get("last_used_at"),
            }

        async def load_organization_members(self, organization_id: str, organization_name: str, viewer_user_id: str) -> dict[str, Any]:
            member_rows = await self.gateway.select(
                "organization_members",
                query={
                    "select": "user_id,member_role,department_id,invited_email,invited_at,created_at",
                    "organization_id": f"eq.{organization_id}",
                    "order": "created_at.asc",
                },
            )
            rows = [row for row in member_rows if row["user_id"] != viewer_user_id]
            if not rows:
                return {"members": [], "total": 0, "organizationName": organization_name, "persisted": True}
            user_ids = [str(row["user_id"]) for row in rows]
            profiles = await self.gateway.select(
                "profiles",
                query={
                    "select": "id,full_name,phone_number,role_id",
                    "id": f"in.({','.join(user_ids)})",
                },
            )
            progress = await self.gateway.select(
                "module_progress",
                query={
                    "select": "user_id,status,completed_at",
                    "user_id": f"in.({','.join(user_ids)})",
                },
            )
            quizzes = await self.gateway.select(
                "quiz_results",
                query={
                    "select": "user_id,score",
                    "user_id": f"in.({','.join(user_ids)})",
                },
            )
            auth_users = {}
            for uid in user_ids:
                auth_user = await self.gateway.admin_get_user(uid)
                if auth_user:
                    auth_users[uid] = auth_user
            profile_by_id = {str(profile["id"]): profile for profile in profiles}
            completed_by_user: dict[str, int] = {}
            latest_completed_by_user: dict[str, str] = {}
            for row in progress:
                if row.get("status") != "hoan-thanh":
                    continue
                uid = str(row["user_id"])
                completed_by_user[uid] = completed_by_user.get(uid, 0) + 1
                completed_at = row.get("completed_at")
                if completed_at and (
                    uid not in latest_completed_by_user
                    or completed_at > latest_completed_by_user[uid]
                ):
                    latest_completed_by_user[uid] = completed_at
            quiz_scores_by_user: dict[str, list[int]] = {}
            for row in quizzes:
                uid = str(row["user_id"])
                quiz_scores_by_user.setdefault(uid, []).append(int(row["score"]))
            members = []
            for row in rows:
                uid = str(row["user_id"])
                profile = profile_by_id.get(uid) or {}
                auth_user = auth_users.get(uid) or {}
                email = auth_user.get("email") or row.get("invited_email")
                metadata = auth_user.get("user_metadata") or {}
                full_name = (
                    str(profile.get("full_name") or "").strip()
                    or str(metadata.get("full_name") or metadata.get("name") or "").strip()
                    or (email.split("@")[0].replace(".", " ").replace("_", " ").replace("-", " ").strip() if email else "Nhân viên mới")
                )
                phone_number = (
                    str(profile.get("phone_number") or "").strip()
                    or str(metadata.get("phone_number") or metadata.get("phone") or auth_user.get("phone") or "").strip()
                    or None
                )
                raw_department = row.get("department_id") or profile.get("role_id") or "khac"
                department_id = raw_department if self.is_department_id(str(raw_department)) else "khac"
                invitation_status = (
                    "active"
                    if auth_user.get("last_sign_in_at") or auth_user.get("confirmed_at")
                    else "pending"
                )
                completed_count = completed_by_user.get(uid, 0)
                completion_pct = min(100, round((completed_count / MODULE_COUNT_PER_ROLE) * 100))
                latest_activity = (
                    self.relative_day_label(latest_completed_by_user.get(uid))
                    or self.relative_day_label(row.get("invited_at") or row.get("created_at"))
                    or ("Đã gửi lời mời" if invitation_status == "pending" else "Chưa bắt đầu")
                )
                scores = quiz_scores_by_user.get(uid, [])
                quiz_score = max(scores) if scores else 0
                members.append(
                    {
                        "id": uid,
                        "fullName": full_name,
                        "email": email,
                        "phoneNumber": phone_number,
                        "departmentId": department_id,
                        "department": self.department_id_to_label(str(department_id)),
                        "memberRole": row.get("member_role"),
                        "invitationStatus": invitation_status,
                        "completionPct": completion_pct,
                        "quizScore": quiz_score,
                        "lastActivity": latest_activity,
                    }
                )
            return {
                "members": members,
                "total": len(members),
                "organizationName": organization_name,
                "persisted": True,
            }

        async def get_active_invite_link_for_manager(
            self, organization_id: str, manager_user_id: str
        ) -> dict[str, Any] | None:
            rows = await self.gateway.select(
                "organization_invite_links",
                query={
                    "select": "id,organization_id,created_by,token,is_active,expires_at,max_uses,used_count,created_at,updated_at,last_used_at,organizations(name)",
                    "organization_id": f"eq.{organization_id}",
                    "created_by": f"eq.{manager_user_id}",
                    "is_active": "eq.true",
                    "order": "created_at.desc",
                    "limit": "1",
                },
            )
            return rows[0] if rows else None

        async def create_invite_link_for_manager(
            self, organization_id: str, manager_user_id: str
        ) -> dict[str, Any]:
            for _ in range(5):
                token = self.generate_invite_token()
                try:
                    rows = await self.gateway.insert(
                        "organization_invite_links",
                        {
                            "organization_id": organization_id,
                            "created_by": manager_user_id,
                            "token": token,
                        },
                        prefer="return=representation",
                    )
                    if rows:
                        row = rows[0]
                        org = await self.get_organization_by_id(organization_id)
                        row["organizations"] = {"name": org["name"] if org else None}
                        return row
                except Exception:
                    existing = await self.get_active_invite_link_for_manager(
                        organization_id, manager_user_id
                    )
                    if existing:
                        return existing
            raise ValueError("Không tạo được token mời duy nhất.")

        async def get_or_create_active_invite_link_for_manager(
            self, organization_id: str, manager_user_id: str
        ) -> dict[str, Any]:
            existing = await self.get_active_invite_link_for_manager(
                organization_id, manager_user_id
            )
            if existing:
                return existing
            return await self.create_invite_link_for_manager(organization_id, manager_user_id)

        async def rotate_invite_link_for_manager(
            self, organization_id: str, manager_user_id: str
        ) -> dict[str, Any]:
            await self.gateway.update(
                "organization_invite_links",
                query={
                    "organization_id": f"eq.{organization_id}",
                    "created_by": f"eq.{manager_user_id}",
                    "is_active": "eq.true",
                },
                payload={
                    "is_active": False,
                    "updated_at": datetime.now(UTC).isoformat(),
                },
            )
            return await self.create_invite_link_for_manager(organization_id, manager_user_id)

        def format_reason_codes(self, codes: list[str]) -> list[str]:
            return [REASON_CODE_LABELS.get(code, code) for code in codes]

        def build_member_recommendations_view(
            self,
            *,
            user_id: str,
            employee_name: str,
            department_id: str | None,
            role_id: str | None,
            recommendation_rows: list[dict[str, Any]],
            assignment_status: str,
        ) -> dict[str, Any]:
            sorted_rows = sorted(
                recommendation_rows,
                key=lambda row: (
                    -int(float(row.get("score") or 0)),
                    row.get("candidate_module_id") or "",
                ),
            )
            recommendations = []
            for row in sorted_rows:
                module_id = str(row["candidate_module_id"])
                module = get_module_by_id(module_id)
                reason_codes = row.get("reason_codes") or []
                recommendations.append(
                    {
                        "moduleId": module_id,
                        "moduleTitle": module.get("title") if module else None,
                        "score": row.get("score") or 0,
                        "reasonLabels": self.format_reason_codes([str(code) for code in reason_codes]),
                    }
                )
            department = (
                self.department_id_to_label(department_id)
                if department_id and self.is_department_id(department_id)
                else department_id
            )
            snapshot_at = str(sorted_rows[0]["created_at"]) if sorted_rows else None
            engine_version = str(sorted_rows[0]["engine_version"]) if sorted_rows else None
            return {
                "userId": user_id,
                "employeeName": employee_name,
                "department": department,
                "roleId": role_id,
                "hasSnapshot": len(recommendations) > 0,
                "snapshotAt": snapshot_at,
                "engineVersion": engine_version,
                "topRecommendation": recommendations[0] if recommendations else None,
                "recommendations": recommendations,
                "assignmentStatus": assignment_status,
            }

        async def get_manager_recommendations(self, organization_id: str) -> dict[str, Any]:
            member_rows = await self.gateway.select(
                "organization_members",
                query={
                    "select": "user_id,department_id,member_role",
                    "organization_id": f"eq.{organization_id}",
                    "member_role": "eq.employee",
                    "order": "created_at.asc",
                },
            )
            user_ids = [str(row["user_id"]) for row in member_rows]
            if not user_ids:
                return {
                    "members": [],
                    "persisted": True,
                    "message": "Chưa có nhân viên trong tổ chức.",
                }
            profiles = await self.gateway.select(
                "profiles",
                query={
                    "select": "id,full_name,role_id",
                    "id": f"in.({','.join(user_ids)})",
                },
            )
            profile_by_id = {str(row["id"]): row for row in profiles}
            try:
                rec_rows = await self.gateway.select(
                    "learning_recommendations",
                    query={
                        "select": "user_id,candidate_module_id,score,reason_codes,engine_version,created_at",
                        "user_id": f"in.({','.join(user_ids)})",
                        "order": "created_at.desc",
                        "limit": "500",
                    },
                )
            except Exception:
                return {
                    "members": [],
                    "persisted": False,
                    "message": "Chưa có bảng gợi ý — chạy migration 0019.",
                }
            try:
                assignments = await self.gateway.select(
                    "learning_assignments",
                    query={
                        "select": "user_id,status",
                        "organization_id": f"eq.{organization_id}",
                        "user_id": f"in.({','.join(user_ids)})",
                        "status": "eq.active",
                    },
                )
            except Exception:
                assignments = []
            rec_by_user: dict[str, list[dict[str, Any]]] = {}
            for row in rec_rows:
                rec_by_user.setdefault(str(row["user_id"]), []).append(row)
            assignment_by_user = {str(row["user_id"]): str(row["status"]) for row in assignments}
            members = []
            for employee in member_rows:
                uid = str(employee["user_id"])
                profile = profile_by_id.get(uid) or {}
                assign_status = assignment_by_user.get(uid)
                assignment_status = (
                    "active" if assign_status == "active" else "completed" if assign_status == "completed" else "none"
                )
                members.append(
                    self.build_member_recommendations_view(
                        user_id=uid,
                        employee_name=str(profile.get("full_name") or "Nhân viên").strip(),
                        department_id=employee.get("department_id"),
                        role_id=profile.get("role_id"),
                        recommendation_rows=rec_by_user.get(uid, []),
                        assignment_status=assignment_status,
                    )
                )
            members.sort(key=lambda item: (not item["hasSnapshot"], item["employeeName"]))
            message = None
            if not any(member["hasSnapshot"] for member in members):
                message = "Nhân viên cần mở /lo-trinh ít nhất một lần để lưu gợi ý lộ trình."
            return {"members": members, "persisted": True, "message": message}

        def get_demo_manager_recommendations(self, organization_name: str) -> dict[str, Any]:
            return {
                "members": DEMO_MANAGER_RECOMMENDATIONS,
                "persisted": False,
                "organizationName": organization_name,
                "message": "Dữ liệu demo — nhân viên mở /lo-trinh để tạo snapshot gợi ý thật.",
            }

        def get_demo_manager_grading_queue(self) -> dict[str, Any]:
            return {
                "items": DEMO_MANAGER_GRADING_QUEUE,
                "persisted": False,
                "message": "Dữ liệu demo — bật Supabase + migration 0020 để dùng queue thật.",
            }

        async def get_manager_grading_queue(self, organization_id: str) -> dict[str, Any]:
            try:
                rows = await self.gateway.select(
                    "grading_results",
                    query={
                        "select": "id,user_id,score,confidence,review_status,feedback,rubric_breakdown,evidence,strengths,improvements,created_at,model,submission_id,assessment_submissions(legacy_module_id)",
                        "organization_id": f"eq.{organization_id}",
                        "review_status": "eq.manager-review",
                        "order": "created_at.desc",
                        "limit": "50",
                    },
                )
            except Exception as exc:
                message = str(exc)
                if self.is_missing_grading_schema(message):
                    return {
                        "items": DEMO_MANAGER_GRADING_QUEUE,
                        "persisted": False,
                        "message": "Chưa có bảng grading — chạy migration 0020_assessment_grading_schema.sql.",
                    }
                raise
    
            user_ids = sorted({str(row["user_id"]) for row in rows if row.get("user_id")})
            profile_map: dict[str, str | None] = {}
            if user_ids:
                profiles = await self.gateway.select(
                    "profiles",
                    query={
                        "select": "id,full_name",
                        "id": f"in.({','.join(user_ids)})",
                    },
                )
                profile_map = {str(profile["id"]): profile.get("full_name") for profile in profiles}
    
            items = []
            for row in rows:
                submission = row.get("assessment_submissions")
                if isinstance(submission, list):
                    submission = submission[0] if submission else None
                module_id = submission.get("legacy_module_id") if isinstance(submission, dict) else None
                module = get_module_by_id(str(module_id)) if module_id else None
                items.append(
                    self.map_grading_row_to_queue_item(
                        {
                            **row,
                            "profiles": {"full_name": profile_map.get(str(row["user_id"]))},
                        },
                        module.get("title") if module else None,
                    )
                )
            return {
                "items": items,
                "persisted": True,
                "message": "Không có bài chờ duyệt." if len(items) == 0 else None,
            }

        async def review_grading_result(
            self,
            *,
            organization_id: str,
            reviewer_id: str,
            result_id: str,
            action: str,
            reason: str,
            adjusted_score: int | None = None,
        ) -> dict[str, Any]:
            try:
                rows = await self.gateway.select(
                    "grading_results",
                    query={
                        "select": "id,score,review_status,submission_id,organization_id",
                        "id": f"eq.{result_id}",
                        "limit": "1",
                    },
                )
            except Exception as exc:
                message = str(exc)
                if self.is_missing_grading_schema(message):
                    raise ValueError("NOT_FOUND: Chưa có bảng grading — chạy migration 0020.")
                raise
    
            existing = rows[0] if rows else None
            if not existing or existing.get("organization_id") != organization_id:
                raise ValueError("NOT_FOUND: Không tìm thấy bài chấm trong tổ chức.")
            if existing.get("review_status") != "manager-review":
                raise ValueError("CONFLICT: Bài này không còn trong hàng đợi chờ duyệt.")
    
            decision = self.resolve_manager_review_decision(
                action,
                int(existing.get("score") or 0),
                adjusted_score,
            )
            await self.gateway.update(
                "grading_results",
                query={
                    "id": f"eq.{result_id}",
                    "organization_id": f"eq.{organization_id}",
                },
                payload={
                    "score": decision["finalScore"],
                    "review_status": decision["reviewStatus"],
                },
            )
            await self.gateway.insert(
                "grading_reviews",
                {
                    "grading_result_id": result_id,
                    "reviewer_id": reviewer_id,
                    "adjusted_score": decision["finalScore"] if action == "adjust" else None,
                    "reason": reason,
                },
            )
            submission_id = existing.get("submission_id")
            if submission_id:
                await self.gateway.update(
                    "assessment_submissions",
                    query={"id": f"eq.{submission_id}"},
                    payload={
                        "status": "needs-revision" if action == "needs-revision" else "graded"
                    },
                )
            return {
                "resultId": result_id,
                "persisted": True,
                "reviewStatus": decision["reviewStatus"],
                "finalScore": decision["finalScore"],
                "message": (
                    "Đã yêu cầu nhân viên làm lại."
                    if action == "needs-revision"
                    else "Đã điều chỉnh điểm và duyệt."
                    if action == "adjust"
                    else "Đã duyệt điểm AI."
                ),
            }

        def build_demo_agent_health_report(self, membership: dict[str, Any]) -> dict[str, Any]:
            now = datetime.now(UTC).isoformat()
            openai = self.is_openai_configured()
            return {
                "generatedAt": now,
                "organizationId": membership["organizationId"],
                "organizationName": membership["organizationName"],
                "persisted": False,
                "message": "Dữ liệu demo — bật Supabase + migrations 0012/0019/0020 để xem số liệu thật theo tổ chức.",
                "platform": {
                    "supabaseConfigured": self.gateway.is_configured(),
                    "openaiConfigured": openai,
                    "openaiModel": self.get_openai_model(),
                    "rateLimitPerDay": self.get_rate_limit_per_day(),
                },
                "agents": [
                    {
                        "id": "tutor",
                        "label": "Trợ lý AI (nhân viên)",
                        "subtitle": "Agent 1 · Gia sư cá nhân theo vai trò",
                        "runtimeMode": "partial" if openai else "demo",
                        "status": "degraded" if openai else "unavailable",
                        "lastActivityAt": now,
                        "callsLast7Days": 12,
                        "callsLast30Days": 48,
                        "metrics": [
                            {"label": "Lượt chat 7 ngày", "value": "12"},
                            {"label": "Người dùng active", "value": "3 / 5 NV"},
                            {"label": "Giới hạn/ngày", "value": str(self.get_rate_limit_per_day())},
                            {"label": "Lần cuối", "value": self.relative_time_label(now)},
                        ],
                        "issues": ["Đang dùng dữ liệu demo, chưa aggregate Supabase"] if openai else ["Thiếu OPENAI_API_KEY — fallback canned"],
                        "links": [
                            {"href": "/tro-ly", "label": "Mở trợ lý AI"},
                            {"href": "/quan-ly/nhan-vien", "label": "Xem nhân viên"},
                        ],
                    },
                    {
                        "id": "grader",
                        "label": "Chấm điểm & đánh giá",
                        "subtitle": "Agent 2 · Quiz rule-based + AI thực hành/tự luận",
                        "runtimeMode": "partial" if openai else "demo",
                        "status": "degraded",
                        "lastActivityAt": now,
                        "callsLast7Days": 5,
                        "callsLast30Days": 18,
                        "metrics": [
                            {"label": "Bài chấm 7 ngày", "value": "5"},
                            {"label": "Chờ quản lý duyệt", "value": "1"},
                            {"label": "Điểm TB", "value": "74"},
                            {"label": "Tin cậy TB", "value": "81%"},
                        ],
                        "issues": ["Demo queue — migration 0020 để persist thật"],
                        "links": [
                            {"href": "/quan-ly/bai-lam", "label": "Hàng đợi duyệt"},
                            {"href": "/lo-trinh", "label": "Bài thực hành NV"},
                        ],
                    },
                    {
                        "id": "recommender",
                        "label": "Gợi ý lộ trình",
                        "subtitle": "Agent 3 · Engine rule-based v1",
                        "runtimeMode": "partial",
                        "status": "degraded",
                        "lastActivityAt": now,
                        "callsLast7Days": 8,
                        "callsLast30Days": 22,
                        "metrics": [
                            {"label": "Snapshot 7 ngày", "value": "8"},
                            {"label": "NV có gợi ý", "value": "4 / 5"},
                            {"label": "Engine", "value": RECOMMENDER_ENGINE_VERSION},
                            {"label": "Lần cuối", "value": self.relative_time_label(now)},
                        ],
                        "issues": ["Demo snapshot — cần migration 0019"],
                        "links": [
                            {"href": "/quan-ly/phan-cong", "label": "Gợi ý theo NV"},
                            {"href": "/lo-trinh", "label": "Xem lộ trình NV"},
                        ],
                    },
                    {
                        "id": "manager-analytics",
                        "label": "Trợ lý quản lý",
                        "subtitle": "Agent 4 · Chat + phân tích đội",
                        "runtimeMode": "partial" if openai else "demo",
                        "status": "degraded" if openai else "unavailable",
                        "lastActivityAt": now,
                        "callsLast7Days": 3,
                        "callsLast30Days": 9,
                        "metrics": [
                            {"label": "Phiên chat QL 7 ngày", "value": "3"},
                            {"label": "Tin nhắn manager", "value": "14"},
                            {"label": "Nguồn team data", "value": "Demo"},
                            {"label": "Lần cuối", "value": self.relative_time_label(now)},
                        ],
                        "issues": ["Demo analytics — cần membership Supabase thật"] if openai else ["Thiếu OPENAI_API_KEY cho chat quản lý"],
                        "links": [
                            {"href": "/quan-ly", "label": "Dashboard đội"},
                            {"href": "/tro-ly", "label": "Chat quản lý"},
                        ],
                    },
                ],
            }

        async def load_agent_health_report(self, membership: dict[str, Any]) -> dict[str, Any]:
            organization_id = membership["organizationId"]
            org_name = membership["organizationName"]
            openai = self.is_openai_configured()
    
            member_rows = await self.gateway.select(
                "organization_members",
                query={
                    "select": "user_id,member_role",
                    "organization_id": f"eq.{organization_id}",
                },
            )
            all_user_ids = [str(row["user_id"]) for row in member_rows]
            employee_user_ids = [str(row["user_id"]) for row in member_rows if row.get("member_role") == "employee"]
            manager_user_ids = [
                str(row["user_id"])
                for row in member_rows
                if row.get("member_role") in {"manager", "owner"}
            ]
            chat_user_ids = employee_user_ids or all_user_ids
            now = datetime.now(UTC)
            since_7 = now.timestamp() - (7 * 24 * 60 * 60)
            since_30 = now.timestamp() - (30 * 24 * 60 * 60)
    
            def in_query(ids: list[str]) -> str:
                return f"in.({','.join(ids)})"
    
            async def load_rows(table: str, select: str, query: dict[str, str]) -> tuple[list[dict[str, Any]], bool]:
                try:
                    rows = await self.gateway.select(table, query={"select": select, **query})
                    return rows, False
                except Exception:
                    return [], True
    
            tutor7_rows, tutor_missing = await load_rows(
                "chat_usage",
                "used_at",
                {"user_id": in_query(chat_user_ids)} if chat_user_ids else {"limit": "0"},
            )
            tutor7 = [row for row in tutor7_rows if datetime.fromisoformat(str(row["used_at"]).replace("Z", "+00:00")).timestamp() >= since_7]
            tutor30 = [row for row in tutor7_rows if datetime.fromisoformat(str(row["used_at"]).replace("Z", "+00:00")).timestamp() >= since_30]
    
            tutor_event_rows, tutor_events_missing = await load_rows(
                "events",
                "created_at,event_name",
                {"user_id": in_query(employee_user_ids or all_user_ids), "event_name": "eq.tutor_message_sent"} if (employee_user_ids or all_user_ids) else {"limit": "0"},
            )
            tutor_event7 = [row for row in tutor_event_rows if datetime.fromisoformat(str(row["created_at"]).replace("Z", "+00:00")).timestamp() >= since_7]
    
            grading_rows, grading_missing = await load_rows(
                "grading_results",
                "created_at,score,confidence,review_status",
                {"organization_id": f"eq.{organization_id}"},
            )
            grader7 = [row for row in grading_rows if datetime.fromisoformat(str(row["created_at"]).replace("Z", "+00:00")).timestamp() >= since_7]
            grader30 = [row for row in grading_rows if datetime.fromisoformat(str(row["created_at"]).replace("Z", "+00:00")).timestamp() >= since_30]
            review_queue_count = len([row for row in grading_rows if row.get("review_status") == "manager-review"])
            avg_score = round(sum(float(row.get("score") or 0) for row in grader30) / len(grader30)) if grader30 else None
            avg_confidence = round((sum(float(row.get("confidence") or 0) for row in grader30) / len(grader30)) * 100) if grader30 else None
    
            rec_rows, rec_missing = await load_rows(
                "learning_recommendations",
                "user_id,engine_version,created_at",
                {"user_id": in_query(all_user_ids)} if all_user_ids else {"limit": "0"},
            )
            rec7 = [row for row in rec_rows if datetime.fromisoformat(str(row["created_at"]).replace("Z", "+00:00")).timestamp() >= since_7]
            rec30 = [row for row in rec_rows if datetime.fromisoformat(str(row["created_at"]).replace("Z", "+00:00")).timestamp() >= since_30]
            latest_rec = max(rec_rows, key=lambda row: str(row.get("created_at") or ""), default=None)
            users_with_rec = len({str(row["user_id"]) for row in rec30})
    
            manager_chat_rows, manager_chat_missing = await load_rows(
                "chat_conversations",
                "updated_at",
                {"user_id": in_query(manager_user_ids), "audience": "eq.manager"} if manager_user_ids else {"limit": "0"},
            )
            manager7 = [row for row in manager_chat_rows if datetime.fromisoformat(str(row["updated_at"]).replace("Z", "+00:00")).timestamp() >= since_7]
            manager30 = [row for row in manager_chat_rows if datetime.fromisoformat(str(row["updated_at"]).replace("Z", "+00:00")).timestamp() >= since_30]
    
            tutor_last_at = max(
                [str(row["used_at"]) for row in tutor7] + [str(row["created_at"]) for row in tutor_event7],
                default=None,
            )
            grader_last_at = max((str(row["created_at"]) for row in grader7), default=None)
            rec_last_at = max((str(row["created_at"]) for row in rec7), default=None)
            manager_last_at = max((str(row["updated_at"]) for row in manager7), default=None)
    
            tutor_calls_7 = max(len(tutor7), len(tutor_event7))
            tutor_calls_30 = len(tutor30)
            tutor_issues: list[str] = []
            if not openai:
                tutor_issues.append("Thiếu OPENAI_API_KEY — chat fallback canned")
            if tutor_missing:
                tutor_issues.append("Chưa có bảng chat_usage")
    
            grader_issues: list[str] = []
            if not openai:
                grader_issues.append("Thiếu OPENAI_API_KEY — chỉ chấm quiz rule-based")
            if grading_missing:
                grader_issues.append("Chưa có migration 0020 (grading_results)")
    
            rec_issues: list[str] = []
            if rec_missing:
                rec_issues.append("Chưa có migration 0019 (learning_recommendations)")
    
            manager_issues: list[str] = []
            if not openai:
                manager_issues.append("Thiếu OPENAI_API_KEY cho chat quản lý")
            if manager_chat_missing:
                manager_issues.append("Chưa có migration 0012 (chat)")
    
            employee_count = len(employee_user_ids) or len(all_user_ids)
            return {
                "generatedAt": datetime.now(UTC).isoformat(),
                "organizationId": organization_id,
                "organizationName": org_name,
                "persisted": True,
                "platform": {
                    "supabaseConfigured": self.gateway.is_configured(),
                    "openaiConfigured": openai,
                    "openaiModel": self.get_openai_model(),
                    "rateLimitPerDay": self.get_rate_limit_per_day(),
                },
                "agents": [
                    {
                        "id": "tutor",
                        "label": "Trợ lý AI (nhân viên)",
                        "subtitle": "Agent 1 · Gia sư cá nhân theo vai trò",
                        "runtimeMode": "live" if openai else "demo",
                        "status": self.resolve_agent_status(
                            runtime_mode="live" if openai else "demo",
                            calls_last_7_days=tutor_calls_7,
                            calls_last_30_days=tutor_calls_30,
                            unavailable=tutor_missing and tutor_events_missing,
                            issues=tutor_issues,
                        ),
                        "lastActivityAt": tutor_last_at,
                        "callsLast7Days": tutor_calls_7,
                        "callsLast30Days": tutor_calls_30,
                        "metrics": [
                            {"label": "Lượt chat 7 ngày", "value": str(tutor_calls_7)},
                            {"label": "NV có chat 30 ngày", "value": f"{'≥1' if tutor_calls_30 > 0 else '0'} / {employee_count}"},
                            {"label": "Giới hạn/ngày", "value": str(self.get_rate_limit_per_day())},
                            {"label": "Lần cuối", "value": self.relative_time_label(tutor_last_at)},
                        ],
                        "issues": tutor_issues,
                        "links": [
                            {"href": "/tro-ly", "label": "Mở trợ lý AI"},
                            {"href": "/quan-ly/nhan-vien", "label": "Xem nhân viên"},
                        ],
                    },
                    {
                        "id": "grader",
                        "label": "Chấm điểm & đánh giá",
                        "subtitle": "Agent 2 · Quiz rule-based + AI thực hành/tự luận",
                        "runtimeMode": "live" if openai else "partial",
                        "status": self.resolve_agent_status(
                            runtime_mode="live" if openai else "partial",
                            calls_last_7_days=len(grader7),
                            calls_last_30_days=len(grader30),
                            unavailable=grading_missing,
                            issues=grader_issues,
                        ),
                        "lastActivityAt": grader_last_at,
                        "callsLast7Days": len(grader7),
                        "callsLast30Days": len(grader30),
                        "metrics": [
                            {"label": "Bài chấm 7 ngày", "value": str(len(grader7))},
                            {"label": "Chờ duyệt", "value": str(review_queue_count)},
                            {"label": "Điểm TB 30 ngày", "value": "—" if avg_score is None else str(avg_score)},
                            {"label": "Tin cậy TB", "value": "—" if avg_confidence is None else f"{avg_confidence}%"},
                        ],
                        "issues": grader_issues,
                        "links": [
                            {"href": "/quan-ly/bai-lam", "label": "Hàng đợi duyệt"},
                            {"href": "/lo-trinh", "label": "Bài thực hành NV"},
                        ],
                    },
                    {
                        "id": "recommender",
                        "label": "Gợi ý lộ trình",
                        "subtitle": "Agent 3 · Engine rule-based",
                        "runtimeMode": "demo" if rec_missing else "live",
                        "status": self.resolve_agent_status(
                            runtime_mode="demo" if rec_missing else "live",
                            calls_last_7_days=len(rec7),
                            calls_last_30_days=len(rec30),
                            unavailable=rec_missing,
                            issues=rec_issues,
                        ),
                        "lastActivityAt": rec_last_at,
                        "callsLast7Days": len(rec7),
                        "callsLast30Days": len(rec30),
                        "metrics": [
                            {"label": "Snapshot 7 ngày", "value": str(len(rec7))},
                            {"label": "NV có gợi ý 30 ngày", "value": f"{users_with_rec} / {employee_count}"},
                            {"label": "Engine", "value": str((latest_rec or {}).get('engine_version') or RECOMMENDER_ENGINE_VERSION)},
                            {"label": "Lần cuối", "value": self.relative_time_label(rec_last_at)},
                        ],
                        "issues": rec_issues,
                        "links": [
                            {"href": "/quan-ly/phan-cong", "label": "Gợi ý theo NV"},
                            {"href": "/lo-trinh", "label": "Xem lộ trình NV"},
                        ],
                    },
                    {
                        "id": "manager-analytics",
                        "label": "Trợ lý quản lý",
                        "subtitle": "Agent 4 · Chat + phân tích đội",
                        "runtimeMode": "live" if openai and not manager_chat_missing else "partial",
                        "status": self.resolve_agent_status(
                            runtime_mode="live" if openai and not manager_chat_missing else "partial",
                            calls_last_7_days=len(manager7),
                            calls_last_30_days=len(manager30),
                            unavailable=manager_chat_missing and not openai,
                            issues=manager_issues,
                        ),
                        "lastActivityAt": manager_last_at,
                        "callsLast7Days": len(manager7),
                        "callsLast30Days": len(manager30),
                        "metrics": [
                            {"label": "Phiên chat QL 7 ngày", "value": str(len(manager7))},
                            {"label": "Phiên chat QL 30 ngày", "value": str(len(manager30))},
                            {"label": "Quản lý trong org", "value": str(len(manager_user_ids))},
                            {"label": "Lần cuối", "value": self.relative_time_label(manager_last_at)},
                        ],
                        "issues": manager_issues,
                        "links": [
                            {"href": "/quan-ly", "label": "Dashboard đội"},
                            {"href": "/tro-ly", "label": "Chat quản lý"},
                        ],
                    },
                ],
            }

        async def add_manager_team_member(
            self,
            *,
            viewer_user_id: str,
            organization_id: str,
            organization_name: str,
            email: str,
            grant_manager_access: bool,
        ) -> dict[str, Any]:
            normalized_email = email.strip().lower()
            if not normalized_email or not EMAIL_REGEX.match(normalized_email):
                raise ValueError("VALIDATION: Email không hợp lệ.")
    
            auth_user = await self.find_auth_user_by_email(normalized_email)
            if not auth_user:
                raise ValueError(
                    "NOT_FOUND: Không tìm thấy tài khoản này. Nhân viên cần đăng ký tài khoản trước khi được thêm vào tổ chức."
                )
    
            memberships = await self.load_memberships_by_user_id(str(auth_user["id"]))
            target_organization_id = organization_id
            private_organization_name: str | None = None
            now = datetime.now(UTC).isoformat()
    
            if grant_manager_access:
                expected_private_org_name = self.manager_private_organization_name(normalized_email)
                blocking_membership = next(
                    (
                        row
                        for row in memberships
                        if self.organization_name_of(row) != expected_private_org_name
                    ),
                    None,
                )
                if blocking_membership:
                    raise ValueError(
                        f"CONFLICT_ORG:{blocking_membership.get('organization_id')}|{self.organization_name_of(blocking_membership)}"
                    )
    
                private_org = await self.get_or_create_manager_private_organization(
                    normalized_email, now
                )
                target_organization_id = str(private_org["id"])
                private_organization_name = str(private_org["name"])
    
            conflict = self.get_single_organization_conflict(
                memberships, target_organization_id
            )
            if conflict["hasConflict"]:
                raise ValueError(
                    f"CONFLICT_ORG:{conflict.get('existingOrganizationId')}|{conflict.get('existingOrganizationName')}"
                )
    
            profile = await self.get_profile_row(str(auth_user["id"]))
            profile = await self.sync_profile_from_auth(str(auth_user["id"]), profile, auth_user)
    
            registered_name = (
                str((profile or {}).get("full_name") or "").strip()
                or self.metadata_name_of(auth_user)
                or self.email_name_fallback(str(auth_user.get("email") or normalized_email))
            )
            registered_phone = (
                str((profile or {}).get("phone_number") or "").strip()
                or self.metadata_phone_of(auth_user)
                or None
            )
            profile_department_id = str((profile or {}).get("role_id") or "")
            department_id = (
                profile_department_id if self.is_department_id(profile_department_id) else "khac"
            )
    
            current_membership = next(
                (
                    row
                    for row in memberships
                    if row.get("organization_id") == target_organization_id
                ),
                None,
            )
    
            requested_member_role = "manager" if grant_manager_access else "employee"
            preserved_role = (
                current_membership.get("member_role")
                if current_membership
                and current_membership.get("member_role") in {"owner", "manager"}
                else requested_member_role
            )
    
            membership_payload = {
                "member_role": preserved_role,
                "department_id": department_id,
                "invited_email": normalized_email,
                "invited_by": viewer_user_id,
                "invited_at": auth_user.get("invited_at") or now,
                "updated_at": now,
            }
            if current_membership:
                await self.gateway.update(
                    "organization_members",
                    query={
                        "organization_id": f"eq.{target_organization_id}",
                        "user_id": f"eq.{auth_user['id']}",
                    },
                    payload=membership_payload,
                )
            else:
                await self.gateway.insert(
                    "organization_members",
                    {
                        "organization_id": target_organization_id,
                        "user_id": auth_user["id"],
                        **membership_payload,
                    },
                )
    
            member = {
                "id": auth_user["id"],
                "fullName": registered_name,
                "email": normalized_email,
                "phoneNumber": registered_phone,
                "departmentId": department_id,
                "department": self.department_id_to_label(department_id),
                "memberRole": preserved_role,
                "invitationStatus": (
                    "active"
                    if auth_user.get("last_sign_in_at") or auth_user.get("confirmed_at")
                    else "pending"
                ),
                "completionPct": 0,
                "quizScore": 0,
                "lastActivity": "Đã tạo công ty riêng" if grant_manager_access else "Đã xác minh",
            }
    
            message = (
                f"Đã xác minh {registered_name} và tạo công ty riêng {private_organization_name}."
                if grant_manager_access
                else f"Đã xác minh {registered_name} và thêm vào tổ chức."
            )
            return {
                "member": member,
                "persisted": True,
                "message": message,
                "organizationName": organization_name,
            }

