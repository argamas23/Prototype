from __future__ import annotations

from fastapi import APIRouter, Depends
from firebase_admin import firestore

from app.config.firebase import get_firestore_client
from app.config.security import AuthUser, get_current_user
from app.schemas.common import data_response
from app.schemas.goals import GoalCreate
from app.services.goals_service import get_goal, set_goal

router = APIRouter()


@router.get("/goals")
async def get_active_goal(
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(get_goal(db, user.uid))


@router.put("/goals")
async def set_active_goal(
    body: GoalCreate,
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(set_goal(db, user.uid, body))
