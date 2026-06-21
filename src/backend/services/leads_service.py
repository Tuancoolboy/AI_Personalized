from __future__ import annotations

from typing import Any

from backend.services.service_base import ServiceBase

class LeadsService(ServiceBase):
        async def create_lead(self, email: str, name: str | None, source: str) -> dict[str, Any]:
            await self.gateway.insert(
                "leads",
                {"email": email, "name": name, "source": source},
            )
            return {"ok": True, "persisted": True}

        async def list_leads(self) -> dict[str, Any]:
            rows = await self.gateway.select(
                "leads",
                query={
                    "select": "id,email,name,source,created_at",
                    "order": "created_at.desc",
                },
            )
            leads = [
                {
                    "id": row["id"],
                    "email": row["email"],
                    "name": row.get("name"),
                    "source": row.get("source") or "landing",
                    "createdAt": row["created_at"],
                }
                for row in rows
            ]
            return {"leads": leads, "total": len(leads), "persisted": True}

