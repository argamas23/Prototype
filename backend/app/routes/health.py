"""Kubernetes-idiomatic split between liveness and readiness probes.

Liveness  — "is the process alive?" — cheap, no dependencies.
            If this fails, the orchestrator should restart the container.
Readiness — "can this instance serve traffic right now?" — checks downstreams.
            If this fails, the orchestrator should take the pod out of the LB
            pool without restarting it.

Keeping them separate is important: a brief Firestore blip should not cause
a restart storm, but it should stop new traffic from arriving.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Response, status
from firebase_admin import firestore

from app.config.firebase import get_firestore_client

router = APIRouter()
logger = logging.getLogger("healthcheck")


@router.get("/health")
async def liveness() -> dict[str, str]:
    """Liveness — no I/O. If the event loop is spinning, we pass."""
    return {"status": "ok"}


@router.get("/ready")
async def readiness(response: Response) -> dict[str, Any]:
    """Readiness — probes Firestore; returns 503 on failure."""
    checks: dict[str, str] = {"firestore": "ok"}
    ok = True

    try:
        db: firestore.Client = await get_firestore_client()
        # Cheapest possible round-trip: list zero collections.
        next(iter(db.collections()), None)
    except Exception as exc:  # noqa: BLE001
        checks["firestore"] = f"fail: {type(exc).__name__}"
        ok = False
        logger.warning("Readiness probe failed", extra={"error": str(exc)})

    if not ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {"status": "ok" if ok else "degraded", "checks": checks}
