from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import structlog

from app.core.config import settings
from app.core.logging import setup_logging
from app.database import engine
from app.api.v1 import api_v1_router

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

app.include_router(api_v1_router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
