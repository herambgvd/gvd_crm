from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from collections import defaultdict
import time
import logging
import os

from core.config import settings
from core.database import connect_database, disconnect_database
from core.permissions import seed_permissions_and_roles
from api.urls import api_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format=settings.LOG_FORMAT
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info(f"Starting {settings.APP_NAME}")
    
    try:
        # Connect to database
        await connect_database()
        logger.info("Database connected successfully")
        
        # Seed default permissions and roles
        await seed_permissions_and_roles()
        logger.info("Permissions and roles seeded")
        
        # Create uploads directory
        uploads_dir = Path(settings.UPLOAD_DIR)
        uploads_dir.mkdir(exist_ok=True)
        logger.info(f"Uploads directory ready: {uploads_dir}")
        
        logger.info(f"{settings.APP_NAME} started successfully")
        
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise
    
    yield
    
    # Shutdown
    try:
        await disconnect_database()
        logger.info("Database disconnected")
        logger.info(f"{settings.APP_NAME} shutdown complete")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# ─── Simple in-memory rate limiter ───────────────────────────────────────────
# Tracks request counts per IP per 60-second window.
_rate_limit_store: dict = defaultdict(lambda: {"count": 0, "window_start": time.time()})

def _rate_limit_check(client_ip: str, limit: int = 60) -> bool:
    """Returns True if request is allowed, False if rate limit exceeded."""
    now = time.time()
    # Cleanup stale entries to prevent memory leak
    stale = [ip for ip, b in _rate_limit_store.items() if now - b["window_start"] > 120]
    for ip in stale:
        del _rate_limit_store[ip]
    bucket = _rate_limit_store[client_ip]
    if now - bucket["window_start"] > 60:
        bucket["count"] = 0
        bucket["window_start"] = now
    bucket["count"] += 1
    return bucket["count"] <= limit


def create_application() -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title=settings.APP_NAME,
        description=settings.APP_DESCRIPTION,
        version=settings.VERSION,
        debug=settings.DEBUG,
        lifespan=lifespan,
        redirect_slashes=False,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )
    
    # ── Rate-limit middleware ──────────────────────────────────────────────────
    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):
        # Skip rate limiting for health checks and static files
        if request.url.path in ("/", "/health", "/api/v1/health") or request.url.path.startswith("/uploads"):
            return await call_next(request)
        client_ip = request.client.host if request.client else "unknown"
        # Apply stricter limit on auth endpoints
        limit = 20 if "/auth/login" in request.url.path else settings.RATE_LIMIT_PER_MINUTE
        if not _rate_limit_check(client_ip, limit):
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
            )
        return await call_next(request)

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )
    
    # Mount static files
    uploads_dir = Path(settings.UPLOAD_DIR)
    uploads_dir.mkdir(exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
    
    # Include API router
    app.include_router(api_router)
    
    # Root endpoint
    @app.get("/")
    async def root():
        """Root endpoint"""
        return {
            "message": f"Welcome to {settings.APP_NAME}",
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "docs": "/docs" if settings.DEBUG else "Documentation disabled in production"
        }
    
    return app

# Create the application instance
app = create_application()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )