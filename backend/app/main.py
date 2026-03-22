import logging
import structlog
import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from .core.config import settings
from .core.logging import setup_logging
from .core.rate_limiter import limiter
from .core.database import SessionLocal
from .routers import auth, transactions, banks

setup_logging()
logger = structlog.get_logger(__name__)

# ── Sentry ────────────────────────────────────────────────────────────────────
if settings.SENTRY_DSN and settings.ENVIRONMENT != "development":
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.2,  # 20% of requests for performance monitoring
        send_default_pii=False,  # Never send PII (emails, tokens) to Sentry
    )
    logger.info("Sentry initialized for environment: %s", settings.ENVIRONMENT)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Chauchero API",
    description="Chilean Bank Spending Tracker API",
    version="0.1.0",
    # Disable Swagger UI in production — it exposes endpoint structure
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(banks.router)


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "message": "Chauchero API",
        "version": "0.1.0",
        "docs": "/docs" if settings.ENVIRONMENT != "production" else None,
    }


# ── Health check ──────────────────────────────────────────────────────────────
@app.get(
    "/health",
    summary="Health check",
    description=(
        "Verifica conectividad con la base de datos ejecutando `SELECT 1`. "
        "Usado por Railway, load balancers y monitores de uptime."
    ),
    responses={
        503: {"description": "Base de datos no disponible"},
    },
)
def health_check():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "db": "ok", "version": "0.1.0"}
    except Exception as e:
        logger.error("Health check failed — DB unreachable: %s", e)
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail={"status": "unhealthy", "db": "unreachable"},
        )
    finally:
        db.close()
