from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import Request

from backend.config import get_settings
from backend.services.constants import (
    DEFAULT_ORGANIZATION_NAME,
    DEMO_SESSION_COOKIE,
    LEGACY_DEPARTMENT_IDS,
)
from backend.services.service_base import ServiceBase
from backend.services.types import NativeSession

class SessionService(ServiceBase):
        async def resolve_session(self, request: Request) -> NativeSession | None:
            if not self.gateway.is_configured():
                demo = request.cookies.get(DEMO_SESSION_COOKIE) == "true"
                if demo:
                    return NativeSession(mode="demo", user_id="demo-user")
                return None
    
            auth_header = request.headers.get("authorization", "")
            if auth_header.lower().startswith("bearer "):
                token = auth_header[7:].strip()
                user = await self.gateway.auth_user(token)
                if not user:
                    return None
                is_manager = await self._user_is_manager(user.id)
                return NativeSession(
                    mode="supabase",
                    user_id=user.id,
                    email=user.email,
                    is_manager=is_manager,
                )
    
            test_user = request.headers.get("x-test-user-id")
            if test_user and get_settings().app_env == "test":
                test_manager = request.headers.get("x-test-manager") == "true"
                return NativeSession(
                    mode="supabase",
                    user_id=test_user,
                    email=request.headers.get("x-test-email"),
                    is_manager=test_manager,
                )
    
            return None

        async def _user_is_manager(self, user_id: str) -> bool:
            rows = await self.gateway.select(
                "organization_members",
                query={
                    "select": "member_role",
                    "user_id": f"eq.{user_id}",
                    "member_role": "in.(owner,manager)",
                    "limit": "1",
                },
            )
            return bool(rows)

        def is_department_id(self, value: str | None) -> bool:
            return value in LEGACY_DEPARTMENT_IDS

        def department_id_to_label(self, department_id: str) -> str:
            mapping = {
                "kinh-doanh": "Kinh doanh",
                "ke-toan": "Kế toán",
                "marketing": "Marketing",
                "van-hanh": "Vận hành",
                "khac": "Khác",
            }
            return mapping.get(department_id, "Khác")

        def manager_private_organization_name(self, email: str) -> str:
            return f"Công ty của {email.strip().lower()}"

        def organization_name_of(self, row: dict[str, Any]) -> str:
            org = row.get("organizations")
            if isinstance(org, list):
                org = org[0] if org else None
            if isinstance(org, dict):
                name = org.get("name")
                if isinstance(name, str) and name.strip():
                    return name.strip()
            return "Tổ chức của bạn"

        def compare_manager_membership_rank(self, row: dict[str, Any]) -> tuple[int, int, int, int]:
            def role_rank(role: str | None) -> int:
                return 0 if role == "owner" else 1
    
            def org_rank(current_row: dict[str, Any]) -> int:
                return 1 if self.organization_name_of(current_row) == DEFAULT_ORGANIZATION_NAME else 0
    
            def timestamp_value(value: Any) -> int:
                if not value:
                    return 0
                parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
                return int(parsed)
    
            return (
                role_rank(row.get("member_role")),
                org_rank(row),
                -timestamp_value(row.get("updated_at")),
                -timestamp_value(row.get("created_at")),
            )

        def select_manager_membership(self, rows: list[dict[str, Any]]) -> dict[str, Any] | None:
            filtered = [row for row in rows if row.get("member_role") in {"manager", "owner"}]
            if not filtered:
                return None
            best = sorted(filtered, key=self.compare_manager_membership_rank)[0]
            return {
                "organizationId": best["organization_id"],
                "organizationName": self.organization_name_of(best),
                "role": best["member_role"],
            }

        async def get_user_membership(self, user_id: str) -> dict[str, Any] | None:
            rows = await self.gateway.select(
                "organization_members",
                query={
                    "select": "organization_id,member_role,department_id",
                    "user_id": f"eq.{user_id}",
                    "limit": "1",
                },
            )
            return rows[0] if rows else None

        async def get_manager_context(self, user_id: str) -> dict[str, Any] | None:
            rows = await self.gateway.select(
                "organization_members",
                query={
                    "select": "organization_id,member_role,updated_at,created_at,organizations(name)",
                    "user_id": f"eq.{user_id}",
                    "member_role": "in.(manager,owner)",
                },
            )
            membership = self.select_manager_membership(rows)
            if not membership:
                return None
            return membership

        def email_name_fallback(self, email: str | None) -> str:
            if not email:
                return "Nhân viên mới"
            local = email.split("@")[0] if "@" in email else email
            cleaned = (
                local.replace(".", " ")
                .replace("_", " ")
                .replace("-", " ")
                .strip()
            )
            return cleaned or "Nhân viên mới"

        def metadata_name_of(self, auth_user: dict[str, Any] | None) -> str | None:
            if not auth_user:
                return None
            metadata = auth_user.get("user_metadata") or {}
            raw = metadata.get("full_name") or metadata.get("name")
            if isinstance(raw, str) and raw.strip():
                return raw.strip()
            return None

        def metadata_phone_of(self, auth_user: dict[str, Any] | None) -> str | None:
            if not auth_user:
                return None
            metadata = auth_user.get("user_metadata") or {}
            raw = (
                metadata.get("phone_number")
                or metadata.get("phone")
                or metadata.get("phoneNumber")
                or auth_user.get("phone")
            )
            if isinstance(raw, str) and raw.strip():
                return raw.strip()
            return None

        def resolve_chat_audience(self, is_manager: bool) -> str:
            return "manager" if is_manager else "employee"

        def summarize_chat_session_title(self, text: str, max_len: int = 50) -> str:
            normalized = " ".join(text.strip().split())
            if not normalized:
                return "Trợ lý học tập"
            if len(normalized) <= max_len:
                return normalized
            cutoff = normalized[:max_len].rstrip()
            if " " in cutoff:
                cutoff = cutoff.rsplit(" ", 1)[0]
            return cutoff.rstrip(".,;:!?") or normalized[:max_len].rstrip()

