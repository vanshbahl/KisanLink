from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    DATABASE_URL: str = "postgresql+asyncpg://kisanlink_user:kisanlink_secure_password@localhost:5432/kisanlink_db"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://kisanlink_user:kisanlink_secure_password@localhost:5432/kisanlink_db"

    JWT_SECRET_KEY: str = "local_insecure_dev_secret_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DEMO_AUTH_ENABLED: bool = False

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"

    LOCAL_CV_MODEL_PATH: str = str(
        Path(__file__).resolve().parents[2] / "models" / "best_freshness_model.pth"
    )
    LOCAL_CV_MODEL_CONFIG_PATH: str = str(
        Path(__file__).resolve().parents[2] / "models" / "model_config.json"
    )
    LOCAL_CV_CLASS_NAMES_PATH: str = str(
        Path(__file__).resolve().parents[2] / "models" / "class_names.json"
    )
    INSPECTION_UPLOAD_DIR: str = str(
        Path(__file__).resolve().parents[2] / "uploads" / "freshness"
    )
    INSPECTION_MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024
    INSPECTION_MAX_IMAGE_PIXELS: int = 40_000_000
    SERVE_LOCAL_INSPECTION_UPLOADS: bool = True

    ALLOWED_CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("ALLOWED_CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def demo_auth_allowed(self) -> bool:
        """Demo authentication is opt-in and can never run in production."""
        return self.DEMO_AUTH_ENABLED and self.ENVIRONMENT.lower() in {
            "development",
            "demo",
            "test",
        }

    @property
    def serve_local_inspection_uploads(self) -> bool:
        """Public local-disk serving is restricted to non-production demos."""
        return self.SERVE_LOCAL_INSPECTION_UPLOADS and self.ENVIRONMENT.lower() in {
            "development",
            "demo",
            "test",
        }

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
