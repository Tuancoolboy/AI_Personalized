"""Aggregate native API routers (replaces monolithic native_routes.py)."""

from fastapi import APIRouter

from backend.api.agent_routes import router as agent_router
from backend.api.chat_routes import router as chat_router
from backend.api.learning_routes import router as learning_router
from backend.api.manager_routes import router as manager_router
from backend.api.org_routes import router as org_router
from backend.api.public_routes import router as public_router
from backend.api.user_routes import router as user_router

router = APIRouter(tags=["native-api"])
router.include_router(user_router)
router.include_router(learning_router)
router.include_router(public_router)
router.include_router(org_router)
router.include_router(manager_router)
router.include_router(chat_router)
router.include_router(agent_router)
