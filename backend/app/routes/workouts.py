from __future__ import annotations

from fastapi import APIRouter, Depends
from firebase_admin import firestore

from app.config.firebase import get_firestore_client
from app.config.security import AuthUser, get_current_user
from app.schemas.common import data_response, list_response
from app.schemas.recommendations import WorkoutPreferencesUpsert
from app.schemas.workouts import LogWorkoutRequest
from app.services.recommendations_service import (
    get_today_recommendation,
    get_weekly_recommendation,
    get_workout_preferences,
    save_preferences_and_recommend,
)
from app.services.workouts_service import (
    delete_workout as delete_workout_svc,
    list_workouts as list_workouts_svc,
    log_workout as log_workout_svc,
    update_workout as update_workout_svc,
)

router = APIRouter()


@router.post("/workouts")
async def log_workout(
    body: LogWorkoutRequest,
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(log_workout_svc(db, user.uid, body))


@router.get("/workouts")
async def list_workouts(
    dateFrom: str | None = None,
    dateTo: str | None = None,
    page: int = 1,
    pageSize: int = 25,
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    page = max(1, page)
    page_size = min(100, max(1, pageSize))
    items, total = list_workouts_svc(db, user.uid, dateFrom, dateTo, page, page_size)
    return list_response(items, page, page_size, total)


@router.get("/workouts/recommendations/today")
async def get_recommendation_for_today(
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(get_today_recommendation(db, user.uid))


@router.get("/workouts/recommendations/week")
async def get_recommendation_for_week(
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(get_weekly_recommendation(db, user.uid))


@router.get("/workouts/preferences")
async def get_preferences(
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(get_workout_preferences(db, user.uid))


@router.put("/workouts/preferences")
async def put_preferences(
    body: WorkoutPreferencesUpsert,
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(save_preferences_and_recommend(db, user.uid, body))


@router.delete("/workouts/{workout_id}")
async def delete_workout(
    workout_id: str,
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(delete_workout_svc(db, user.uid, workout_id))


@router.put("/workouts/{workout_id}")
async def put_workout(
    workout_id: str,
    body: LogWorkoutRequest,
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(update_workout_svc(db, user.uid, workout_id, body))
