import os
import logging
from typing import List, Optional
from pathlib import Path
from dotenv import load_dotenv
import secrets

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

_config_logger = logging.getLogger("config")

def _get_secret(env_var: str, fallback_warning: str) -> str:
    val = os.getenv(env_var)
    if val:
        return val
    _config_logger.warning(fallback_warning)
    return secrets.token_urlsafe(32)

class Settings:
    """Application settings configuration"""

    # App Configuration
    APP_NAME: str = os.getenv("APP_NAME", "GVD CRM API")
    APP_DESCRIPTION: str = os.getenv("APP_DESCRIPTION", "A comprehensive B2B Multi-Channel CRM system")
    VERSION: str = os.getenv("VERSION", "1.0.0")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Database Configuration
    MONGODB_URL: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DB_NAME", "gvd_crm_db")

    # Security Configuration — warn if env vars not set (sessions break on restart)
    SECRET_KEY: str = _get_secret(
        "SECRET_KEY",
        "SECRET_KEY not set in environment — using generated value. All sessions will reset on restart!"
    )
    JWT_SECRET: str = _get_secret(
        "JWT_SECRET",
        "JWT_SECRET not set in environment — using generated value. All tokens will be invalidated on restart!"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = int(os.getenv("JWT_EXPIRATION_HOURS", "8"))
    JWT_REFRESH_EXPIRATION_DAYS: int = int(os.getenv("JWT_REFRESH_EXPIRATION_DAYS", "30"))

    # CORS Configuration — defaults to localhost dev only; set CORS_ORIGINS in .env for production
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # File Upload Configuration
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", str(ROOT_DIR / "uploads"))
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(10 * 1024 * 1024)))  # 10MB
    ALLOWED_FILE_TYPES: List[str] = [
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
        "jpg", "jpeg", "png", "gif", "svg",
        "txt", "csv", "zip", "rar"
    ]
    
    # Email Configuration
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: Optional[str] = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "True").lower() == "true"
    
    # External APIs
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY")
    
    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Cache Configuration
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL")
    CACHE_EXPIRATION_SECONDS: int = int(os.getenv("CACHE_EXPIRATION_SECONDS", "300"))  # 5 minutes
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "300"))
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = int(os.getenv("DEFAULT_PAGE_SIZE", "50"))
    MAX_PAGE_SIZE: int = int(os.getenv("MAX_PAGE_SIZE", "100"))
    
    # Background Tasks
    CELERY_BROKER_URL: Optional[str] = os.getenv("CELERY_BROKER_URL")
    CELERY_RESULT_BACKEND: Optional[str] = os.getenv("CELERY_RESULT_BACKEND")
    
    # Monitoring
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN")
    
    # Business Logic Settings
    DEFAULT_CURRENCY: str = os.getenv("DEFAULT_CURRENCY", "USD")
    DEFAULT_TIMEZONE: str = os.getenv("DEFAULT_TIMEZONE", "UTC")
    
    # Feature Flags
    ENABLE_ANALYTICS: bool = os.getenv("ENABLE_ANALYTICS", "True").lower() == "true"
    ENABLE_NOTIFICATIONS: bool = os.getenv("ENABLE_NOTIFICATIONS", "True").lower() == "true"
    ENABLE_AUDIT_LOG: bool = os.getenv("ENABLE_AUDIT_LOG", "True").lower() == "true"
    
    class Config:
        case_sensitive = True

# Create global settings instance
settings = Settings()

# Validate required settings
def validate_settings():
    """Validate required settings on startup"""
    errors = []
    
    if not settings.SECRET_KEY:
        errors.append("SECRET_KEY is required")
    
    if not settings.JWT_SECRET:
        errors.append("JWT_SECRET is required")
    
    if not settings.MONGODB_URL:
        errors.append("MONGODB_URL is required")
    
    if not settings.DATABASE_NAME:
        errors.append("DATABASE_NAME is required")
    
    if errors:
        raise ValueError(f"Configuration errors: {', '.join(errors)}")

# Auto-validate settings on import
validate_settings()