from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import firestore

from app.config.firebase import get_firestore_client
from app.config.security import AuthUser, get_current_user
from app.schemas.common import data_response
from app.services.analytics_service import get_daily_progress

router = APIRouter()


@router.get("/analytics/daily")
async def get_analytics_daily(
    dateFrom: str,
    dateTo: str,
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    try:
        start = date.fromisoformat(dateFrom)
        end = date.fromisoformat(dateTo)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="dateFrom/dateTo must be YYYY-MM-DD",
        ) from exc

    if start > end:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="dateFrom must be <= dateTo")

    max_days = 93  # ~3 months to keep queries bounded for the prototype
    if (end.toordinal() - start.toordinal() + 1) > max_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Date range too large (max {max_days} days)",
        )

    return data_response(get_daily_progress(db, user.uid, dateFrom, dateTo))

