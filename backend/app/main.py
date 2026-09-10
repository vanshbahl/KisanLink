from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
import structlog

from app.core.config import settings
from app.core.logging import setup_logging
from app.database import engine
from app.api.v1 import api_v1_router
from app.api.legacy_logistics import router as legacy_logistics_router

setup_logging()
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting KisanLink Backend API", environment=settings.ENVIRONMENT)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection successfully established")
    except Exception as exc:
        logger.error("Failed to connect to database on startup", error=str(exc))
    yield
    await engine.dispose()
    logger.info("KisanLink Backend API shutdown complete")


app = FastAPI(
    title="KisanLink API",
    description="Direct Farm-to-Buyer Operating System API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.serve_local_inspection_uploads:
    inspection_upload_dir = Path(settings.INSPECTION_UPLOAD_DIR)
    inspection_upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount(
        "/uploads/freshness",
        StaticFiles(directory=inspection_upload_dir),
        name="inspection-uploads",
    )

# Canonical v1 API routers (Farmer, Consumer, Bulk Buyer, Auth, Orders, Matching)
app.include_router(api_v1_router)

# Isolated Legacy Logistics & Prototype router (Temporary protected boundary for Logistics Dashboard)
app.include_router(legacy_logistics_router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
