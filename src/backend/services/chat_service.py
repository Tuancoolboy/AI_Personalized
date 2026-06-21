from __future__ import annotations

from typing import Any

from backend.services.constants import DEFAULT_CONVERSATION_TITLES, VALID_ROLES
from backend.services.service_base import ServiceBase

class ChatService(ServiceBase):
        async def list_chat_conversations(
            self,
            user_id: str,
            audience: str,
        ) -> list[dict[str, Any]]:
            rows = await self.gateway.select(
                "chat_conversations",
                query={
                    "select": "id,title,updated_at,created_at",
                    "user_id": f"eq.{user_id}",
                    "audience": f"eq.{audience}",
                    "order": "updated_at.desc",
                    "limit": "50",
                },
            )
            default_title = DEFAULT_CONVERSATION_TITLES[audience]
            return [
                {
                    "id": str(row["id"]),
                    "title": str(row.get("title") or "").strip() or default_title,
                    "updatedAt": row["updated_at"],
                    "createdAt": row["created_at"],
                }
                for row in rows
            ]

        async def delete_chat_conversation(self, user_id: str, conversation_id: str) -> bool:
            rows = await self.gateway.delete(
                "chat_conversations",
                query={
                    "id": f"eq.{conversation_id}",
                    "user_id": f"eq.{user_id}",
                },
            )
            return bool(rows)

        async def load_chat_history(
            self,
            user_id: str,
            audience: str,
            conversation_id: str | None = None,
            *,
            draft: bool = False,
        ) -> dict[str, Any]:
            memory_rows = await self.gateway.select(
                "chat_memories",
                query={
                    "select": "core_context",
                    "user_id": f"eq.{user_id}",
                    "audience": f"eq.{audience}",
                    "limit": "1",
                },
            )
            core_context = memory_rows[0].get("core_context") if memory_rows else None
            resume_lesson = None
            if audience == "employee":
                profile = await self.get_profile(user_id)
                role_id = profile.get("roleId")
                if isinstance(role_id, str) and role_id in VALID_ROLES:
                    resume_lesson = await self.resolve_resume_lesson(user_id, role_id)
    
            if draft:
                return {
                    "conversationId": None,
                    "coreContext": None,
                    "resumeLesson": resume_lesson,
                    "messages": [],
                }
    
            resolved_conversation_id = conversation_id
            if resolved_conversation_id:
                owned_rows = await self.gateway.select(
                    "chat_conversations",
                    query={
                        "select": "id",
                        "id": f"eq.{resolved_conversation_id}",
                        "user_id": f"eq.{user_id}",
                        "audience": f"eq.{audience}",
                        "limit": "1",
                    },
                )
                if not owned_rows:
                    resolved_conversation_id = None
    
            if not resolved_conversation_id:
                latest_rows = await self.gateway.select(
                    "chat_conversations",
                    query={
                        "select": "id",
                        "user_id": f"eq.{user_id}",
                        "audience": f"eq.{audience}",
                        "order": "updated_at.desc",
                        "limit": "1",
                    },
                )
                resolved_conversation_id = str(latest_rows[0]["id"]) if latest_rows else None
    
            if not resolved_conversation_id:
                return {
                    "conversationId": None,
                    "coreContext": core_context,
                    "resumeLesson": resume_lesson,
                    "messages": [],
                }
    
            message_rows = await self.gateway.select(
                "chat_messages",
                query={
                    "select": "id,role,content,created_at",
                    "conversation_id": f"eq.{resolved_conversation_id}",
                    "order": "created_at.asc",
                    "limit": "100",
                },
            )
            return {
                "conversationId": resolved_conversation_id,
                "coreContext": core_context,
                "resumeLesson": resume_lesson,
                "messages": [
                    {
                        "id": str(row["id"]),
                        "role": str(row["role"]),
                        "content": str(row["content"]),
                        "createdAt": row["created_at"],
                    }
                    for row in message_rows
                    if row.get("role") in {"user", "assistant"} and isinstance(row.get("content"), str)
                ],
            }
