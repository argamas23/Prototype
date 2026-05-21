from __future__ import annotations

from typing import Any

from firebase_admin import firestore

from app.repositories.goals_repo import get_active_goal_ref
from app.schemas.goals import GoalCreate
from app.utils.firestore import serialize_document


def get_goal(db: firestore.Client, uid: str) -> dict[str, Any] | None:
    snap = get_active_goal_ref(db, uid).get()
    if not snap.exists:
        return None
    data = snap.to_dict() or {}
    data["id"] = snap.id
    return serialize_document(data)


def set_goal(db: firestore.Client, uid: str, body: GoalCreate) -> dict[str, Any]:
    ref = get_active_goal_ref(db, uid)
    payload = {
        **body.model_dump(),
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }
    snap = ref.get()
    if not snap.exists:
        payload["createdAt"] = firestore.SERVER_TIMESTAMP
    ref.set(payload, merge=True)
    updated = ref.get().to_dict() or {}
    updated["id"] = "active"
    return serialize_document(updated)
