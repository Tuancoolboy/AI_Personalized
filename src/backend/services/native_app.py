from __future__ import annotations

from backend.services.chat_service import ChatService
from backend.services.constants import (
    ALLOWED_EVENTS,
    DEMO_SESSION_COOKIE,
    VALID_PROGRESS_STATUS,
    VALID_ROLES,
)
from backend.services.leads_service import LeadsService
from backend.services.learning_service import LearningService
from backend.services.manager_service import ManagerService
from backend.services.organization_service import OrganizationService
from backend.services.session_service import SessionService
from backend.services.supabase_gateway import SupabaseGateway, get_supabase_gateway
from backend.services.types import NativeSession
from backend.services.user_service import UserService

__all__ = [
    "ALLOWED_EVENTS",
    "DEMO_SESSION_COOKIE",
    "NativeAppService",
    "NativeSession",
    "VALID_PROGRESS_STATUS",
    "VALID_ROLES",
    "get_native_app_service",
]


class NativeAppService(
    SessionService,
    UserService,
    LeadsService,
    LearningService,
    OrganizationService,
    ManagerService,
    ChatService,
):
    """Facade composing domain services for backward compatibility."""

    def __init__(self, gateway: SupabaseGateway) -> None:
        self.gateway = gateway


_service: NativeAppService | None = None


def get_native_app_service() -> NativeAppService:
    global _service
    if _service is None:
        _service = NativeAppService(get_supabase_gateway())
    return _service
