from __future__ import annotations

from fastapi import APIRouter, Depends
from firebase_admin import firestore

from app.config.firebase import get_firestore_client
from app.config.security import AuthUser, get_current_user
from app.schemas.common import data_response
from app.schemas.profile import ProfileUpsert
from app.services.profile_service import get_profile, upsert_profile

router = APIRouter()


@router.get("/profile")
async def get_user_profile(
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(get_profile(db, user.uid))


@router.put("/profile")
async def put_user_profile(
    body: ProfileUpsert,
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(upsert_profile(db, user.uid, body))

