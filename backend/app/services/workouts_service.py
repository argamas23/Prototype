from __future__ import annotations

from typing import Any

from firebase_admin import firestore

from app.errors import WorkoutNotFound
from app.repositories.workouts_repo import get_workout_snapshot, workouts_ref
from app.schemas.workouts import LogWorkoutRequest
from app.services.analytics_service import invalidate_analytics
from app.services.dashboard_service import invalidate_dashboard
from app.services.recommendations_service import append_activity_history_entry
from app.utils.firestore import serialize_document


def _derive_workout_type(exercise_types: list[str]) -> str:
    unique = {t for t in exercise_types if isinstance(t, str) and t}
    if len(unique) == 1:
        return next(iter(unique))
    return "Other"


def log_workout(db: firestore.Client, uid: str, body: LogWorkoutRequest) -> dict[str, Any]:
    workout_ref = workouts_ref(db, uid).document()
    payload = body.model_dump(exclude_none=True)

    if body.exercises:
        payload["durationMinutes"] = sum(int(ex.durationMinutes or 0) for ex in body.exercises)
        payload["caloriesBurned"] = sum(float(ex.caloriesBurned or 0) for ex in body.exercises)
        payload["workoutType"] = _derive_workout_type([ex.workoutType for ex in body.exercises])

    payload["createdAt"] = firestore.SERVER_TIMESTAMP
    workout_ref.set(payload)
    snap = workout_ref.get()
    data = snap.to_dict() or {}
    data["id"] = snap.id

    invalidate_dashboard(uid, str(body.date))
    invalidate_analytics(uid)
    result = serialize_document(data)
    append_activity_history_entry(db, uid, result)
    return result


def list_workouts(
    db: firestore.Client,
    uid: str,
    date_from: str | None,
    date_to: str | None,
    page: int,
    page_size: int,
) -> tuple[list[dict[str, Any]], int]:
    # Push date filtering to Firestore — avoid stream-and-discard.
    query = workouts_ref(db, uid)
    if date_from:
        query = query.where("date", ">=", date_from)
    if date_to:
        query = query.where("date", "<=", date_to)
    query = query.order_by("date", direction=firestore.Query.DESCENDING)

    results: list[dict[str, Any]] = []
    for snap in query.stream():
        data = snap.to_dict() or {}
        data["id"] = snap.id
        results.append(serialize_document(data))

    total = len(results)
    start = (page - 1) * page_size
    return results[start : start + page_size], total


def delete_workout(db: firestore.Client, uid: str, workout_id: str) -> dict[str, Any]:
    snap = get_workout_snapshot(db, uid, workout_id)
    if not snap.exists:
        raise WorkoutNotFound(f"Workout {workout_id} not found")
    data = snap.to_dict() or {}
    snap.reference.delete()

    invalidate_dashboard(uid, str(data.get("date") or ""))
    invalidate_analytics(uid)
    return {"deleted": True, "id": workout_id}


def update_workout(db: firestore.Client, uid: str, workout_id: str, body: LogWorkoutRequest) -> dict[str, Any]:
    snap = get_workout_snapshot(db, uid, workout_id)
    if not snap.exists:
        raise WorkoutNotFound(f"Workout {workout_id} not found")

    existing = snap.to_dict() or {}
    payload = body.model_dump(exclude_none=True)

    if body.exercises:
        payload["durationMinutes"] = sum(int(ex.durationMinutes or 0) for ex in body.exercises)
        payload["caloriesBurned"] = sum(float(ex.caloriesBurned or 0) for ex in body.exercises)
        payload["workoutType"] = _derive_workout_type([ex.workoutType for ex in body.exercises])

    payload["createdAt"] = existing.get("createdAt", firestore.SERVER_TIMESTAMP)
    payload["updatedAt"] = firestore.SERVER_TIMESTAMP

    workouts_ref(db, uid).document(workout_id).set(payload)
    updated_snap = workouts_ref(db, uid).document(workout_id).get()
    data = updated_snap.to_dict() or {}
    data["id"] = updated_snap.id

    invalidate_dashboard(uid, str(body.date))
    invalidate_analytics(uid)

    return serialize_document(data)
