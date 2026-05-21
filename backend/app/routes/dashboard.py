from __future__ import annotations

from datetime import date as dt_date

from fastapi import APIRouter, Depends
from firebase_admin import firestore

from app.config.firebase import get_firestore_client
from app.config.security import AuthUser, get_current_user
from app.schemas.common import data_response
from app.services.dashboard_service import get_summary

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(
    date: str | None = None,
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    target_date = date or dt_date.today().isoformat()
    return data_response(get_summary(db, user.uid, target_date))
