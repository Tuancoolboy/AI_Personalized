from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.services.chat_service import ChatService


@pytest.mark.asyncio
async def test_load_chat_history_resolves_resume_lesson_for_employee():
    gateway = MagicMock()
    service = ChatService(gateway)
    service.get_profile = AsyncMock(
        return_value={"roleId": "marketing", "fullName": "Hai", "aiLevel": 1}
    )
    service.resolve_resume_lesson = AsyncMock(
        return_value={"moduleId": "marketing-m1", "title": "Bai 1", "href": "/lo-trinh/marketing-m1"}
    )

    async def select_side_effect(table: str, *, query, **kwargs):
        if table == "chat_memories":
            return [{"core_context": None}]
        if table == "chat_conversations":
            return []
        return []

    gateway.select = AsyncMock(side_effect=select_side_effect)

    result = await service.load_chat_history("u1", "employee")

    assert result["resumeLesson"]["moduleId"] == "marketing-m1"
    service.resolve_resume_lesson.assert_awaited_once_with("u1", "marketing")


@pytest.mark.asyncio
async def test_load_chat_history_draft_does_not_leak_core_context():
    gateway = MagicMock()
    service = ChatService(gateway)

    async def select_side_effect(table: str, *, query, **kwargs):
        if table == "chat_memories":
            return [{"core_context": "cũ"}]
        if table == "chat_conversations":
            return []
        return []

    gateway.select = AsyncMock(side_effect=select_side_effect)
    service.get_profile = AsyncMock(return_value={"roleId": "marketing", "fullName": "Hai", "aiLevel": 1})
    service.resolve_resume_lesson = AsyncMock(return_value=None)

    result = await service.load_chat_history("u1", "employee", draft=True)

    assert result["conversationId"] is None
    assert result["coreContext"] is None
    assert result["messages"] == []
