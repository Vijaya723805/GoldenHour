from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "GoldenHour"
    PROJECT_DESCRIPTION: str = (
        "AI-Powered UPI Fraud Reporting and Emergency Assistance Platform"
    )
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=True, env="DEBUG")

    # CORS configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
    ]

    # Anthropic / Claude API
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")
    ANTHROPIC_MODEL: str = Field(
        default="claude-3-5-sonnet-20241022", env="ANTHROPIC_MODEL"
    )

    # Supabase configuration
    SUPABASE_URL: Optional[str] = Field(default=None, env="SUPABASE_URL")
    SUPABASE_KEY: Optional[str] = Field(default=None, env="SUPABASE_KEY")
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = Field(
        default=None, env="SUPABASE_SERVICE_ROLE_KEY"
    )
    SUPABASE_BUCKET_EVIDENCE: str = Field(
        default="evidence-vault", env="SUPABASE_BUCKET_EVIDENCE"
    )

    # File uploads & storage
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 15
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "webp", "pdf"]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    # Security & Compliance Safeguards
    # GoldenHour never stores sensitive credentials
    FORBIDDEN_KEYWORDS: List[str] = [
        "upi pin",
        "mpin",
        "atm pin",
        "cvv",
        "otp",
        "one time password",
        "netbanking password",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
