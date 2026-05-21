from __future__ import annotations

from typing import Any

from firebase_admin import firestore

from app.repositories.profile_repo import get_profile_snapshot, profile_ref
from app.schemas.profile import ProfileUpsert
from app.utils.firestore import serialize_document


def _clean_str_list(values: list[str]) -> list[str]:
    cleaned: list[str] = []
    for value in values:
        if not isinstance(value, str):
            continue
        v = value.strip()
        if not v:
            continue
        if len(v) > 64:
            v = v[:64]
        cleaned.append(v)
    # de-dupe while preserving order
    seen: set[str] = set()
    out: list[str] = []
    for v in cleaned:
        if v.lower() in seen:
            continue
        seen.add(v.lower())
        out.append(v)
    return out


def get_profile(db: firestore.Client, uid: str) -> dict[str, Any] | None:
    snap = get_profile_snapshot(db, uid)
    if not snap.exists:
        return None
    data = snap.to_dict() or {}
    data["id"] = snap.id
    return serialize_document(data)


def upsert_profile(db: firestore.Client, uid: str, body: ProfileUpsert) -> dict[str, Any]:
    ref = profile_ref(db, uid)
    payload = body.model_dump(exclude_unset=True)
    if "fullName" in payload and payload["fullName"] is not None:
        payload["fullName"] = payload["fullName"].strip()
    if "dietaryPreferences" in payload:
        payload["dietaryPreferences"] = _clean_str_list(payload.get("dietaryPreferences") or [])
    if "allergies" in payload:
        payload["allergies"] = _clean_str_list(payload.get("allergies") or [])

    payload["updatedAt"] = firestore.SERVER_TIMESTAMP
    existing = ref.get()
    if not existing.exists:
        payload["createdAt"] = firestore.SERVER_TIMESTAMP

    ref.set(payload, merge=True)
    updated = ref.get().to_dict() or {}
    updated["id"] = "main"
    return serialize_document(updated)

