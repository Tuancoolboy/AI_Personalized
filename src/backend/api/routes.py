from __future__ import annotations

from fastapi import APIRouter

from backend.config import get_settings
from backend.models.schemas import BackendStatusResponse

ops_router = APIRouter(prefix="/api/v1", tags=["backend-ops"])


@ops_router.get("/status", response_model=BackendStatusResponse)
async def backend_status() -> BackendStatusResponse:
    settings = get_settings()
    return BackendStatusResponse(
        status="ready",
        env=settings.app_env,
    )
