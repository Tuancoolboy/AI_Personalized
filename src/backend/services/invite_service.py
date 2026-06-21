from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from backend.services.service_base import ServiceBase


def build_invite_path(token: str) -> str:
    return f"/moi/{token}"


class InviteService(ServiceBase):
    async def find_active_invite_by_token(self, token: str) -> dict[str, Any] | None:
        rows = await self.gateway.select(
            "company_invite_links",
            query={
                "select": "id,token,organization_id,created_by,expires_at,max_uses,used_count,is_active",
                "token": f"eq.{token}",
                "is_active": "eq.true",
                "limit": "1",
            },
        )
        if not rows:
            return None
        row = rows[0]
        if row.get("expires_at"):
            expires = datetime.fromisoformat(str(row["expires_at"]).replace("Z", "+00:00"))
            if expires < datetime.now(UTC):
                return None
        max_uses = row.get("max_uses")
        used = int(row.get("used_count") or 0)
        if isinstance(max_uses, int) and max_uses > 0 and used >= max_uses:
            return None
        return row

    async def get_profile_role_id(self, user_id: str) -> str | None:
        rows = await self.gateway.select(
            "profiles",
            query={"select": "role_id", "id": f"eq.{user_id}", "limit": "1"},
        )
        if rows and isinstance(rows[0].get("role_id"), str):
            return rows[0]["role_id"]
        return None

    def post_accept_redirect_path(self, member_role: str | None, role_id: str | None) -> str:
        if member_role in {"manager", "owner"}:
            return "/quan-ly"
        return "/lo-trinh" if role_id else "/onboarding"

    async def accept_organization_invite(
        self,
        *,
        token: str,
        user_id: str,
        user_email: str | None,
    ) -> dict[str, Any]:
        invite = await self.find_active_invite_by_token(token)
        if not invite:
            return {"ok": False, "error": "invalid"}

        org_id = invite["organization_id"]
        memberships = await self.gateway.select(
            "organization_members",
            query={
                "select": "organization_id,member_role,department_id",
                "user_id": f"eq.{user_id}",
            },
        )
        other_orgs = [m for m in memberships if m.get("organization_id") != org_id]
        if other_orgs:
            return {"ok": False, "error": "already-member"}

        current = next((m for m in memberships if m.get("organization_id") == org_id), None)
        now = datetime.now(UTC).isoformat()
        if current:
            await self.gateway.update(
                "organization_members",
                query={
                    "organization_id": f"eq.{org_id}",
                    "user_id": f"eq.{user_id}",
                },
                payload={
                    "department_id": current.get("department_id") or "khac",
                    "invited_email": user_email,
                    "invited_by": invite.get("created_by"),
                    "invited_at": now,
                    "updated_at": now,
                },
            )
            member_role = current.get("member_role")
        else:
            await self.gateway.insert(
                "organization_members",
                {
                    "organization_id": org_id,
                    "user_id": user_id,
                    "member_role": "employee",
                    "department_id": "khac",
                    "invited_email": user_email,
                    "invited_by": invite.get("created_by"),
                    "invited_at": now,
                    "updated_at": now,
                },
            )
            member_role = "employee"

        await self.gateway.update(
            "company_invite_links",
            query={"id": f"eq.{invite['id']}"},
            payload={"used_count": int(invite.get("used_count") or 0) + 1},
        )

        role_id = await self.get_profile_role_id(user_id)
        return {
            "ok": True,
            "redirectPath": self.post_accept_redirect_path(member_role, role_id),
        }


_invite_service: InviteService | None = None


def get_invite_service() -> InviteService:
    global _invite_service
    if _invite_service is None:
        from backend.services.supabase_gateway import get_supabase_gateway

        _invite_service = InviteService(get_supabase_gateway())
    return _invite_service
