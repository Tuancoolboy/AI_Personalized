from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from backend.services.constants import VALID_ROLES
from backend.services.openai_helpers import (
    build_employee_system_prompt,
    build_manager_system_prompt,
    get_cached_answer,
    get_fallback_answer,
    get_openai_client,
    get_openai_model,
    get_rate_limit_per_day,
    get_safety_warning,
    is_openai_configured,
    strip_leading_assistant_greeting,
)
from backend.services.service_base import ServiceBase
from backend.services.types import NativeSession

DAY_MS = 24 * 60 * 60 * 1000


class _MemoryRateLimiter:
    def __init__(self) -> None:
        self._counts: dict[str, list[float]] = {}

    def check(self, key: str, limit: int) -> tuple[bool, str | None]:
        now = datetime.now(UTC).timestamp() * 1000
        window_start = now - DAY_MS
        entries = [ts for ts in self._counts.get(key, []) if ts >= window_start]
        self._counts[key] = entries
        if len(entries) >= limit:
            reset = datetime.fromtimestamp((window_start + DAY_MS) / 1000, tz=UTC)
            return False, reset.isoformat()
        entries.append(now)
        self._counts[key] = entries
        return True, None


_memory_limiter = _MemoryRateLimiter()


class ChatAiService(ServiceBase):
    async def _resolve_role_id(
        self,
        session: NativeSession,
        body_role_id: Any,
        is_manager: bool,
    ) -> str | None:
        if is_manager:
            return None
        if isinstance(body_role_id, str) and body_role_id in VALID_ROLES:
            return body_role_id
        if session.mode == "supabase":
            rows = await self.gateway.select(
                "profiles",
                query={"select": "role_id", "id": f"eq.{session.user_id}", "limit": "1"},
            )
            if rows and rows[0].get("role_id") in VALID_ROLES:
                return str(rows[0]["role_id"])
        return None

    async def check_rate_limit(self, user_id: str) -> dict[str, Any]:
        limit = get_rate_limit_per_day()
        since = (datetime.now(UTC) - timedelta(days=1)).isoformat()
        rows = await self.gateway.select(
            "chat_usage",
            query={
                "select": "id",
                "user_id": f"eq.{user_id}",
                "used_at": f"gte.{since}",
            },
        )
        used = len(rows)
        allowed = used < limit
        reset_at = (datetime.now(UTC) + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()
        return {"allowed": allowed, "used": used, "limit": limit, "resetAt": reset_at}

    async def record_chat_usage(self, user_id: str) -> None:
        await self.gateway.insert(
            "chat_usage",
            {"user_id": user_id, "used_at": datetime.now(UTC).isoformat()},
        )

    async def stream_chat(
        self,
        session: NativeSession,
        body: dict[str, Any],
    ) -> tuple[Any, dict[str, str]]:
        message = str(body.get("message") or "").strip()
        if not message or len(message) > 4000:
            raise ValueError("VALIDATION:Tin nhắn không hợp lệ (tối đa 4000 ký tự).")

        is_manager = session.is_manager
        role_id = await self._resolve_role_id(session, body.get("role_id"), is_manager)
        if not is_manager and not role_id:
            raise ValueError("VALIDATION:Chưa chọn vai trò. Hoàn thành onboarding trước.")

        safety = get_safety_warning(message)
        headers: dict[str, str] = {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
        }

        if not is_openai_configured():
            cached_role = role_id or "khac"
            cached = get_cached_answer(cached_role, message)
            fallback = {"answer": cached, "safety": safety} if cached else get_fallback_answer(message, cached_role)
            answer = strip_leading_assistant_greeting(str(fallback["answer"]))
            safety_msg = fallback.get("safety") or safety
            headers["X-Chat-Mode"] = "demo"

            async def canned_stream():
                if safety_msg:
                    yield f"__SAFETY__:{safety_msg}\n"
                yield answer

            return canned_stream(), headers

        if session.mode == "demo":
            if role_id:
                cached = get_cached_answer(role_id, message)
                if cached:
                    headers["X-Chat-Mode"] = "cache"

                    async def cache_stream():
                        if safety:
                            yield f"__SAFETY__:{safety}\n"
                        yield cached

                    return cache_stream(), headers
            allowed, reset_at = _memory_limiter.check(f"chat-demo:{session.user_id}", get_rate_limit_per_day())
            if not allowed:
                raise ValueError(f"RATE_LIMIT:Hết lượt hôm nay.|{reset_at}")
            headers["X-Chat-Mode"] = "demo-openai"
            system = (
                build_manager_system_prompt()
                if is_manager
                else build_employee_system_prompt(role_id or "khac")
            )
            return self._openai_stream(system, message, safety, headers), headers

        rate = await self.check_rate_limit(session.user_id)
        if not rate["allowed"]:
            raise ValueError(
                f"RATE_LIMIT:Hết lượt hôm nay.|{rate['resetAt']}|{rate['used']}|{rate['limit']}"
            )

        if role_id:
            cached = get_cached_answer(role_id, message)
            if cached:
                await self.record_chat_usage(session.user_id)
                headers["X-Chat-Mode"] = "cache"

                async def supabase_cache_stream():
                    if safety:
                        yield f"__SAFETY__:{safety}\n"
                    yield cached

                return supabase_cache_stream(), headers

        profile_name = ""
        if session.mode == "supabase":
            rows = await self.gateway.select(
                "profiles",
                query={"select": "full_name", "id": f"eq.{session.user_id}", "limit": "1"},
            )
            if rows and rows[0].get("full_name"):
                profile_name = str(rows[0]["full_name"])

        system = (
            build_manager_system_prompt(profile_name)
            if is_manager
            else build_employee_system_prompt(role_id or "khac", profile_name)
        )
        await self.record_chat_usage(session.user_id)
        headers["X-Chat-Mode"] = "openai"
        conversation_id = str(body.get("conversation_id") or "") or None
        if conversation_id:
            headers["X-Conversation-Id"] = conversation_id
        return self._openai_stream(system, message, safety, headers), headers

    def _openai_stream(self, system: str, message: str, safety: str | None, headers: dict[str, str]):
        client = get_openai_client()
        if not client:
            async def fallback_stream():
                fb = get_fallback_answer(message, "khac")
                if fb.get("safety") or safety:
                    yield f"__SAFETY__:{fb.get('safety') or safety}\n"
                yield strip_leading_assistant_greeting(str(fb["answer"]))
            return fallback_stream()

        async def stream():
            if safety:
                yield f"__SAFETY__:{safety}\n"
            response = await client.chat.completions.create(
                model=get_openai_model(),
                stream=True,
                max_tokens=500,
                temperature=0.7,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": message},
                ],
            )
            raw_text = ""
            async for chunk in response:
                text = chunk.choices[0].delta.content or ""
                if text:
                    raw_text += text
            answer = strip_leading_assistant_greeting(raw_text)
            if answer:
                yield answer

        return stream()


_chat_ai_service: ChatAiService | None = None


def get_chat_ai_service() -> ChatAiService:
    global _chat_ai_service
    if _chat_ai_service is None:
        from backend.services.supabase_gateway import get_supabase_gateway

        _chat_ai_service = ChatAiService(get_supabase_gateway())
    return _chat_ai_service
