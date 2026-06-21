from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.native_routes import router as native_router
from backend.api.routes import ops_router
from backend.config import get_settings
from backend.services.supabase_gateway import close_supabase_gateway


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    print(f"Starting {settings.app_name} in {settings.app_env} mode")
    yield
    await close_supabase_gateway()
    print("Shutting down...")


app = FastAPI(
    title="AI Trợ Lý API",
    description="FastAPI backend for AI Trợ Lý — native API surface",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ops_router)
app.include_router(native_router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "env": settings.app_env,
    }
