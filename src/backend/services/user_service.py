from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from backend.services.constants import MODULE_COUNT_PER_ROLE
from backend.services.learning_data import get_module_by_id, get_modules_for_role
from backend.services.service_base import ServiceBase

class UserService(ServiceBase):
        async def get_profile(self, user_id: str) -> dict[str, Any]:
            rows = await self.gateway.select(
                "profiles",
                query={
                    "select": "role_id,full_name,ai_level,email,phone_number",
                    "id": f"eq.{user_id}",
                    "limit": "1",
                },
            )
            row = rows[0] if rows else {}
            return {
                "roleId": row.get("role_id"),
                "fullName": row.get("full_name"),
                "email": row.get("email"),
                "phoneNumber": row.get("phone_number"),
                "aiLevel": row.get("ai_level") or 0,
            }

        async def get_profile_row(self, user_id: str) -> dict[str, Any] | None:
            rows = await self.gateway.select(
                "profiles",
                query={
                    "select": "id,full_name,phone_number,role_id,email",
                    "id": f"eq.{user_id}",
                    "limit": "1",
                },
            )
            return rows[0] if rows else None

        async def resolve_resume_lesson(self, user_id: str, role_id: str) -> dict[str, Any] | None:
            rows = await self.gateway.select(
                "module_progress",
                query={
                    "select": "module_id,status",
                    "user_id": f"eq.{user_id}",
                },
            )
            progress_by_module_id = {
                str(row["module_id"]): str(row["status"])
                for row in rows
                if row.get("module_id") and row.get("status")
            }
            modules = get_modules_for_role(role_id, 0)
            if not modules:
                return None
            in_progress_id = next(
                (
                    module_id
                    for module_id, status in progress_by_module_id.items()
                    if status == "dang-hoc"
                ),
                None,
            )
            if in_progress_id:
                module = get_module_by_id(in_progress_id)
                if module:
                    return {
                        "moduleId": module["id"],
                        "title": module["title"],
                        "href": f"/lo-trinh/{module['id']}",
                        "status": "dang-hoc",
                    }
            next_module = next(
                (
                    module
                    for module in modules
                    if progress_by_module_id.get(str(module["id"])) != "hoan-thanh"
                ),
                None,
            )
            if not next_module:
                return None
            return {
                "moduleId": next_module["id"],
                "title": next_module["title"],
                "href": f"/lo-trinh/{next_module['id']}",
                "status": "chua-hoc",
            }

        async def update_profile(self, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
            rows = await self.gateway.update(
                "profiles",
                query={"id": f"eq.{user_id}"},
                payload=payload,
            )
            if not rows:
                raise HTTPException(status_code=500, detail="Không lưu được hồ sơ.")
            row = rows[0]
            return {
                "roleId": row.get("role_id"),
                "fullName": row.get("full_name"),
                "email": row.get("email"),
                "phoneNumber": row.get("phone_number"),
                "aiLevel": row.get("ai_level") or 0,
            }

        async def get_progress(self, user_id: str) -> dict[str, str]:
            rows = await self.gateway.select(
                "module_progress",
                query={
                    "select": "module_id,status",
                    "user_id": f"eq.{user_id}",
                },
            )
            return {str(row["module_id"]): str(row["status"]) for row in rows}

        async def save_progress(self, user_id: str, module_id: str, status: str) -> dict[str, str]:
            completed_at = None
            if status == "hoan-thanh":
                completed_at = datetime.now(UTC).isoformat()
            await self.gateway.upsert(
                "module_progress",
                {
                    "user_id": user_id,
                    "module_id": module_id,
                    "status": status,
                    "completed_at": completed_at,
                },
                on_conflict="user_id,module_id",
            )
            return await self.get_progress(user_id)

        async def get_time_logs(self, user_id: str) -> dict[str, Any]:
            rows = await self.gateway.select(
                "time_logs",
                query={
                    "select": "id,hours_saved,usefulness,note,logged_at",
                    "user_id": f"eq.{user_id}",
                    "order": "logged_at.desc",
                },
            )
            logs = [
                {
                    "id": row["id"],
                    "hoursSaved": float(row["hours_saved"]),
                    "usefulness": row.get("usefulness"),
                    "note": row.get("note"),
                    "loggedAt": row["logged_at"],
                }
                for row in rows
            ]
            total_hours = sum(log["hoursSaved"] for log in logs)
            return {"logs": logs, "totalHours": total_hours}

        async def create_time_log(
            self,
            user_id: str,
            *,
            hours_saved: float,
            usefulness: int | None,
            note: str | None,
        ) -> dict[str, Any]:
            await self.gateway.insert(
                "time_logs",
                {
                    "user_id": user_id,
                    "hours_saved": hours_saved,
                    "usefulness": usefulness,
                    "note": note,
                },
            )
            return await self.get_time_logs(user_id)

        async def record_event(self, user_id: str, event_name: str, properties: dict[str, Any]) -> dict[str, Any]:
            try:
                await self.gateway.insert(
                    "events",
                    {
                        "user_id": user_id,
                        "event_name": event_name,
                        "properties_json": properties,
                    },
                )
            except Exception:
                return {"persisted": False}
            return {"persisted": True}

