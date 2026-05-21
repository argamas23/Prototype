from __future__ import annotations

from typing import Any

from firebase_admin import firestore

from app.errors import PlanForbidden, PlanNotFound
from app.repositories.plans_repo import get_plan_snapshot, plans_ref
from app.schemas.plans import WorkoutPlanIn
from app.utils.firestore import serialize_document


def _snapshot_to_plan(snap) -> dict[str, Any]:
    data = snap.to_dict() or {}
    data["id"] = snap.id
    return serialize_document(data)


def _sort_plans_newest_first(plans: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        plans,
        key=lambda plan: str(plan.get("updatedAt") or plan.get("createdAt") or ""),
        reverse=True,
    )


def list_public_plans(db: firestore.Client) -> list[dict[str, Any]]:
    docs = list(plans_ref(db).stream())
    return _sort_plans_newest_first([_snapshot_to_plan(snap) for snap in docs])


def list_admin_plans(db: firestore.Client, owner_email: str) -> list[dict[str, Any]]:
    query = plans_ref(db).where("ownerEmail", "==", owner_email)
    return _sort_plans_newest_first([_snapshot_to_plan(snap) for snap in query.stream()])


def create_admin_plan(db: firestore.Client, owner_email: str, body: WorkoutPlanIn) -> dict[str, Any]:
    plan_ref = plans_ref(db).document()
    payload = body.model_dump(exclude_none=True)
    payload["ownerEmail"] = owner_email
    payload["createdAt"] = firestore.SERVER_TIMESTAMP
    payload["updatedAt"] = firestore.SERVER_TIMESTAMP
    plan_ref.set(payload)
    return _snapshot_to_plan(plan_ref.get())


def update_admin_plan(db: firestore.Client, owner_email: str, plan_id: str, body: WorkoutPlanIn) -> dict[str, Any]:
    snap = get_plan_snapshot(db, plan_id)
    if not snap.exists:
        raise PlanNotFound(f"Plan {plan_id} not found")
    existing = snap.to_dict() or {}
    if existing.get("ownerEmail") != owner_email:
        raise PlanForbidden("You can only edit your own plans")

    payload = body.model_dump(exclude_none=True)
    payload["ownerEmail"] = owner_email
    payload["createdAt"] = existing.get("createdAt")
    payload["updatedAt"] = firestore.SERVER_TIMESTAMP
    snap.reference.set(payload)
    return _snapshot_to_plan(snap.reference.get())
