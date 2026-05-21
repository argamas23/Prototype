from __future__ import annotations

import logging
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config.config import get_settings
from app.config.logging import setup_logging
from app.config.rate_limit import limiter
from app.errors import DomainError
from app.observability import register_metrics_endpoint, register_metrics_middleware
from app.routes import analytics, auth, dashboard, goals, health, meals, plans, profile, workouts

settings = get_settings()
setup_logging(settings.environment, settings.log_level)
logger = logging.getLogger("app.main")

app = FastAPI(title="HealthSync API", version="0.1.0")


@app.exception_handler(DomainError)
async def _domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    # Single mapping point from domain failure → HTTP envelope, so service code
    # never depends on the transport layer.
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


cors_origins = settings.cors_origins
cors_allow_credentials = cors_origins != ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


@app.middleware("http")
async def log_requests(request, call_next):
    request_id = request.headers.get("x-request-id") or uuid4().hex
    start = perf_counter()
    client_ip = request.client.host if request.client else None
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((perf_counter() - start) * 1000, 2)
        logger.exception(
            "Unhandled exception",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "duration_ms": duration_ms,
                "client_ip": client_ip,
            },
        )
        raise
    duration_ms = round((perf_counter() - start) * 1000, 2)
    logger.info(
        "HTTP request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "client_ip": client_ip,
        },
    )
    response.headers["X-Request-ID"] = request_id
    return response


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(meals.router, prefix="/api/v1")
app.include_router(workouts.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(goals.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(plans.router, prefix="/api/v1")

# Prometheus-compatible /metrics endpoint + per-request counter/histogram.
# Mounted last so it observes everything but is itself excluded from the schema.
register_metrics_middleware(app)
register_metrics_endpoint(app)
