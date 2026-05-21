from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from firebase_admin import firestore

from app.config.firebase import get_firestore_client
from app.schemas.common import data_response
from app.schemas.plans import WorkoutPlanIn
from app.services.plans_service import (
    create_admin_plan,
    list_admin_plans,
    list_public_plans,
    update_admin_plan,
)

PLAN_ADMIN_EMAIL = "planAdmin@gmail.com"
PLAN_ADMIN_TOKEN = "healthsync-plan-admin"

router = APIRouter()


async def get_plan_admin_email(
    x_plan_admin_email: str | None = Header(default=None),
    x_plan_admin_token: str | None = Header(default=None),
) -> str:
    if x_plan_admin_email == PLAN_ADMIN_EMAIL and x_plan_admin_token == PLAN_ADMIN_TOKEN:
        return PLAN_ADMIN_EMAIL
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="PlanAdmin access required")


@router.get("/plans")
async def get_public_plans(db: firestore.Client = Depends(get_firestore_client)) -> dict:
    return data_response(list_public_plans(db))


@router.get("/plans/admin")
async def get_admin_plans(
    admin_email: str = Depends(get_plan_admin_email),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(list_admin_plans(db, admin_email))


@router.post("/plans/admin")
async def post_admin_plan(
    body: WorkoutPlanIn,
    admin_email: str = Depends(get_plan_admin_email),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(create_admin_plan(db, admin_email, body))


@router.put("/plans/admin/{plan_id}")
async def put_admin_plan(
    plan_id: str,
    body: WorkoutPlanIn,
    admin_email: str = Depends(get_plan_admin_email),
    db: firestore.Client = Depends(get_firestore_client),
) -> dict:
    return data_response(update_admin_plan(db, admin_email, plan_id, body))
