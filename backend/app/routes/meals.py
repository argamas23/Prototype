from __future__ import annotations

from fastapi import APIRouter, Depends, File, Request, UploadFile
from firebase_admin import firestore

from app.config.firebase import get_firestore_client
from app.config.rate_limit import limiter
from app.config.security import AuthUser, get_current_user
from app.schemas.common import data_response, list_response
from app.schemas.meals import LogMealRequest
from app.services.meals_service import (
    analyze_image as analyze_image_svc,
    delete_meal as delete_meal_svc,
    list_meals as list_meals_svc,
    log_meal as log_meal_svc,
    update_meal as update_meal_svc,
)

router = APIRouter()


@router.post("/meals/analyze-image")
@limiter.limit("5/minute")
async def analyze_image(
    request: Request,
    file: UploadFile = File(...),
    user: AuthUser = Depends(get_current_user),
) -> dict:
    image_bytes = await file.read()
    items = await analyze_image_svc(image_bytes)
    items_data = [item.model_dump() for item in items]
    return data_response(items_data)


@router.post("/meals")
async def log_meal(
    body: LogMealRequest,
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(log_meal_svc(db, user.uid, body))


@router.get("/meals")
async def list_meals(
    dateFrom: str | None = None,
    dateTo: str | None = None,
    page: int = 1,
    pageSize: int = 25,
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    page = max(1, page)
    page_size = min(100, max(1, pageSize))
    items, total = list_meals_svc(db, user.uid, dateFrom, dateTo, page, page_size)
    return list_response(items, page, page_size, total)


@router.delete("/meals/{meal_id}")
async def delete_meal(
    meal_id: str,
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(delete_meal_svc(db, user.uid, meal_id))


@router.put("/meals/{meal_id}")
async def put_meal(
    meal_id: str,
    body: LogMealRequest,
    user: AuthUser = Depends(get_current_user),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(update_meal_svc(db, user.uid, meal_id, body))
