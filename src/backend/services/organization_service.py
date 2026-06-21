from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from backend.services.constants import (
    DEFAULT_ORGANIZATION_NAME,
    DEFAULT_PRIMARY_TOOL,
    EMAIL_REGEX,
    LEGACY_DEPARTMENT_IDS,
    SINGLE_ORGANIZATION_CONFLICT_MESSAGE,
    VALID_PRIMARY_TOOLS,
)
from backend.services.organization_logic import (
    dedupe_organization_slug,
    is_valid_organization_slug,
    slugify_organization_name,
)
from backend.services.service_base import ServiceBase
from backend.services.supabase_gateway import SupabaseUser

class OrganizationService(ServiceBase):
        async def find_auth_user_by_email(self, email: str) -> dict[str, Any] | None:
            normalized = email.lower()
            rows = await self.gateway.select(
                "profiles",
                query={
                    "select": "id",
                    "email": f"eq.{normalized}",
                    "limit": "1",
                },
            )
            if not rows or not rows[0].get("id"):
                return None
            return await self.gateway.admin_get_user(str(rows[0]["id"]))

        async def load_memberships_by_user_id(self, user_id: str) -> list[dict[str, Any]]:
            return await self.gateway.select(
                "organization_members",
                query={
                    "select": "organization_id,member_role,updated_at,created_at,organizations(name)",
                    "user_id": f"eq.{user_id}",
                },
            )

        def get_single_organization_conflict(
            self,
            rows: list[dict[str, Any]],
            target_organization_id: str,
        ) -> dict[str, Any]:
            for row in rows:
                if row.get("organization_id") != target_organization_id:
                    return {
                        "hasConflict": True,
                        "existingOrganizationId": row.get("organization_id"),
                        "existingOrganizationName": self.organization_name_of(row),
                    }
            return {"hasConflict": False}

        async def get_or_create_manager_private_organization(
            self,
            email: str,
            now: str,
        ) -> dict[str, Any]:
            name = self.manager_private_organization_name(email)
            rows = await self.gateway.upsert(
                "organizations",
                {
                    "name": name,
                    "updated_at": now,
                },
                on_conflict="name",
            )
            if not rows:
                raise ValueError("Không tạo được tổ chức riêng.")
            return rows[0]

        async def sync_profile_from_auth(
            self,
            user_id: str,
            profile: dict[str, Any] | None,
            auth_user: dict[str, Any],
        ) -> dict[str, Any] | None:
            profile_update: dict[str, Any] = {}
            metadata_name = self.metadata_name_of(auth_user)
            registered_phone = self.metadata_phone_of(auth_user)
            if not ((profile or {}).get("full_name") or "").strip() and metadata_name:
                profile_update["full_name"] = metadata_name
            if not ((profile or {}).get("phone_number") or "").strip() and registered_phone:
                profile_update["phone_number"] = registered_phone
            if not profile_update:
                return profile
            if profile:
                rows = await self.gateway.update(
                    "profiles",
                    query={"id": f"eq.{user_id}"},
                    payload=profile_update,
                )
            else:
                rows = await self.gateway.upsert(
                    "profiles",
                    {
                        "id": user_id,
                        **profile_update,
                    },
                    on_conflict="id",
                )
            return rows[0] if rows else profile

        async def collect_taken_slugs(self, exclude_organization_id: str | None = None) -> set[str]:
            rows = await self.gateway.select(
                "organizations",
                query={"select": "id,slug"},
            )
            return {
                str(row["slug"])
                for row in rows
                if row.get("slug") and row.get("id") != exclude_organization_id
            }

        def map_organization_row(self, row: dict[str, Any]) -> dict[str, Any]:
            return {
                "id": row["id"],
                "name": row["name"],
                "slug": row["slug"],
                "logoUrl": row.get("logo_url"),
                "status": row.get("status"),
                "settings": row.get("settings_json") or {},
                "createdBy": row.get("created_by"),
            }

        async def get_organization_by_id(self, organization_id: str) -> dict[str, Any] | None:
            rows = await self.gateway.select(
                "organizations",
                query={
                    "select": "id,name,slug,logo_url,status,settings_json,created_by",
                    "id": f"eq.{organization_id}",
                    "limit": "1",
                },
            )
            return self.map_organization_row(rows[0]) if rows else None

        async def get_public_organization_by_slug(self, slug: str) -> dict[str, Any] | None:
            rows = await self.gateway.select(
                "organizations",
                query={
                    "select": "name,slug,logo_url,status",
                    "slug": f"eq.{slug}",
                    "limit": "1",
                },
            )
            if not rows or rows[0].get("status") != "active":
                return None
            row = rows[0]
            return {
                "name": row["name"],
                "slug": row["slug"],
                "logoUrl": row.get("logo_url"),
            }

        async def create_organization_for_owner(
            self,
            *,
            user_id: str,
            name: str,
            slug: str | None,
        ) -> dict[str, Any]:
            trimmed_name = name.strip()
            if len(trimmed_name) < 2:
                raise ValueError("VALIDATION: Tên công ty phải có ít nhất 2 ký tự.")
            existing_membership = await self.get_user_membership(user_id)
            if existing_membership:
                raise ValueError("CONFLICT: Tài khoản đã thuộc một công ty.")
            taken_slugs = await self.collect_taken_slugs()
            requested_slug = (
                slugify_organization_name(slug)
                if slug and slug.strip()
                else slugify_organization_name(trimmed_name)
            )
            if not is_valid_organization_slug(requested_slug):
                raise ValueError("VALIDATION: Slug công ty không hợp lệ.")
            final_slug = dedupe_organization_slug(requested_slug, taken_slugs)
            now = datetime.now(UTC).isoformat()
            org_rows = await self.gateway.insert(
                "organizations",
                {
                    "name": trimmed_name,
                    "slug": final_slug,
                    "status": "active",
                    "settings_json": {},
                    "created_by": user_id,
                    "updated_at": now,
                },
                prefer="return=representation",
            )
            organization = org_rows[0]
            await self.gateway.insert(
                "organization_members",
                {
                    "organization_id": organization["id"],
                    "user_id": user_id,
                    "member_role": "owner",
                    "department_id": "khac",
                    "invited_at": now,
                    "updated_at": now,
                },
            )
            return self.map_organization_row(organization)

        async def update_organization_for_owner(
            self,
            *,
            organization_id: str,
            user_id: str,
            name: str | None = None,
            logo_url: str | None | object = Ellipsis,
            settings: dict[str, Any] | None = None,
        ) -> dict[str, Any]:
            membership = await self.get_user_membership(user_id)
            if (
                not membership
                or membership["organization_id"] != organization_id
                or membership["member_role"] != "owner"
            ):
                raise ValueError("FORBIDDEN: Chỉ chủ công ty mới chỉnh sửa được cài đặt.")
            patch: dict[str, Any] = {"updated_at": datetime.now(UTC).isoformat()}
            if name is not None:
                trimmed_name = name.strip()
                if len(trimmed_name) < 2:
                    raise ValueError("VALIDATION: Tên công ty phải có ít nhất 2 ký tự.")
                patch["name"] = trimmed_name
            if logo_url is not Ellipsis:
                patch["logo_url"] = logo_url.strip() if isinstance(logo_url, str) and logo_url.strip() else None
            if settings is not None:
                patch["settings_json"] = settings
            rows = await self.gateway.update(
                "organizations",
                query={"id": f"eq.{organization_id}"},
                payload=patch,
            )
            if not rows:
                raise HTTPException(status_code=500, detail="Không cập nhật được công ty.")
            return self.map_organization_row(rows[0])

        async def get_current_organization(self, user_id: str) -> dict[str, Any]:
            membership = await self.get_user_membership(user_id)
            if not membership:
                return {"organization": None, "membership": None}
            organization = await self.get_organization_by_id(membership["organization_id"])
            return {
                "organization": organization,
                "membership": {
                    "role": membership["member_role"],
                    "organizationId": membership["organization_id"],
                },
            }

        def is_primary_tool(self, value: str) -> bool:
            return value in VALID_PRIMARY_TOOLS

        async def get_org_ai_tool(self, user_id: str) -> dict[str, Any]:
            membership = await self.get_user_membership(user_id)
            if not membership:
                return {"aiTool": DEFAULT_PRIMARY_TOOL, "persisted": False}
            rows = await self.gateway.select(
                "organizations",
                query={
                    "select": "ai_tool",
                    "id": f"eq.{membership['organization_id']}",
                    "limit": "1",
                },
            )
            ai_tool = str(rows[0].get("ai_tool") or "") if rows else ""
            return {
                "aiTool": ai_tool if self.is_primary_tool(ai_tool) else DEFAULT_PRIMARY_TOOL,
                "persisted": bool(rows),
            }

        async def update_org_ai_tool(self, user_id: str, ai_tool: str) -> dict[str, Any]:
            manager_context = await self.get_manager_context(user_id)
            if not manager_context:
                raise ValueError("FORBIDDEN: Chỉ quản lý được đổi công cụ AI của công ty.")
            if not self.is_primary_tool(ai_tool):
                raise ValueError("VALIDATION: Công cụ AI không hợp lệ.")
            rows = await self.gateway.update(
                "organizations",
                query={"id": f"eq.{manager_context['organizationId']}"},
                payload={
                    "ai_tool": ai_tool,
                    "updated_at": datetime.now(UTC).isoformat(),
                },
            )
            if not rows:
                raise HTTPException(status_code=500, detail="Chưa lưu được công cụ AI.")
            await self.record_event(
                user_id,
                "audit:org.ai_tool.update",
                {
                    "organizationId": manager_context["organizationId"],
                    "aiTool": ai_tool,
                },
            )
            return {"aiTool": ai_tool, "persisted": True}

        def role_id_to_legacy_department_id(self, role_id: str) -> str | None:
            return role_id if role_id in LEGACY_DEPARTMENT_IDS else None

        async def sync_member_department_for_user(self, user_id: str, role_id: str) -> dict[str, Any]:
            department_id = self.role_id_to_legacy_department_id(role_id)
            if not department_id:
                return {"updated": False, "skippedReason": "invalid-role"}
            membership = await self.get_user_membership(user_id)
            if not membership:
                return {"updated": False, "skippedReason": "no-membership"}
            if membership["member_role"] != "employee":
                return {"updated": False, "skippedReason": "not-employee"}
            if membership.get("department_id") == department_id:
                return {"updated": False, "skippedReason": "already-synced"}
            await self.gateway.update(
                "organization_members",
                query={
                    "user_id": f"eq.{user_id}",
                    "member_role": "eq.employee",
                },
                payload={
                    "department_id": department_id,
                    "updated_at": datetime.now(UTC).isoformat(),
                },
            )
            return {"updated": True}

