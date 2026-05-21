from __future__ import annotations

from datetime import date
from typing import Any

from firebase_admin import firestore

from app.repositories.goals_repo import get_active_goal_ref
from app.repositories.profile_repo import get_profile_snapshot
from app.repositories.recommendations_repo import activity_history_ref, workout_preferences_ref
from app.schemas.recommendations import (
    WorkoutPreferencesOut,
    WorkoutPreferencesUpsert,
)
from app.services.recommendation_engine import RecommendationContext, RecommendationEngine
from app.utils.firestore import serialize_document


def _clean_str_list(values: list[str]) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for value in values:
        if not isinstance(value, str):
            continue
        item = value.strip()
        if not item:
            continue
        lowered = item.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        cleaned.append(item[:64])
    return cleaned


def _default_preferences() -> dict[str, Any]:
    return WorkoutPreferencesUpsert().model_dump()


def get_workout_preferences(db: firestore.Client, uid: str) -> dict[str, Any]:
    snap = workout_preferences_ref(db, uid).get()
    if not snap.exists:
        return {"id": "workout", **_default_preferences(), "createdAt": None, "updatedAt": None}
    data = snap.to_dict() or {}
    data["id"] = snap.id
    return serialize_document(data)


def upsert_workout_preferences(db: firestore.Client, uid: str, body: WorkoutPreferencesUpsert) -> dict[str, Any]:
    ref = workout_preferences_ref(db, uid)
    payload = body.model_dump(exclude_unset=True)
    for key in ("availableEquipment", "injuries", "avoidExercises", "preferredWorkoutTypes"):
        if key in payload:
            payload[key] = _clean_str_list(payload.get(key) or [])
    payload["updatedAt"] = firestore.SERVER_TIMESTAMP
    existing = ref.get()
    if not existing.exists:
        payload["createdAt"] = firestore.SERVER_TIMESTAMP
    ref.set(payload, merge=True)
    updated = get_workout_preferences(db, uid)
    return updated


def list_recent_activity_history(db: firestore.Client, uid: str, limit: int = 12) -> list[dict[str, Any]]:
    docs = list(
        activity_history_ref(db, uid)
        .order_by("date", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
    )
    items: list[dict[str, Any]] = []
    for snap in docs:
        data = snap.to_dict() or {}
        data["id"] = snap.id
        items.append(serialize_document(data))
    return items


def build_recommendation_context(
    db: firestore.Client,
    uid: str,
    today: str | None = None,
) -> RecommendationContext:
    profile_snap = get_profile_snapshot(db, uid)
    profile = serialize_document(profile_snap.to_dict() or {}) if profile_snap.exists else {}

    goal_snap = get_active_goal_ref(db, uid).get()
    goal = serialize_document(goal_snap.to_dict() or {}) if goal_snap.exists else None

    preferences_data = get_workout_preferences(db, uid)
    preferences = WorkoutPreferencesOut(**preferences_data)

    activity_history = list_recent_activity_history(db, uid)
    return RecommendationContext(
        profile=profile,
        goal=goal,
        preferences=preferences,
        activity_history=activity_history,
        today=today or date.today().isoformat(),
    )


def get_today_recommendation(db: firestore.Client, uid: str, today: str | None = None) -> dict[str, Any]:
    context = build_recommendation_context(db, uid, today=today)
    recommendation = RecommendationEngine().generate(context)
    return recommendation.model_dump()


def get_weekly_recommendation(db: firestore.Client, uid: str, today: str | None = None) -> dict[str, Any]:
    context = build_recommendation_context(db, uid, today=today)
    recommendation = RecommendationEngine().generate_week(context)
    return recommendation.model_dump()


def save_preferences_and_recommend(db: firestore.Client, uid: str, body: WorkoutPreferencesUpsert) -> dict[str, Any]:
    preferences = upsert_workout_preferences(db, uid, body)
    recommendation = get_today_recommendation(db, uid)
    return {"preferences": preferences, "recommendation": recommendation}


def append_activity_history_entry(
    db: firestore.Client,
    uid: str,
    workout: dict[str, Any],
) -> None:
    ref = activity_history_ref(db, uid).document()
    recommendation_context = workout.get("recommendationContext") or {}
    payload = {
        "date": workout.get("date"),
        "workoutType": workout.get("workoutType"),
        "durationMinutes": workout.get("durationMinutes"),
        "intensity": workout.get("intensity"),
        "caloriesBurned": workout.get("caloriesBurned", 0),
        "completed": True,
        "followedRecommendation": bool(recommendation_context),
        "strategy": recommendation_context.get("strategy"),
        "difficulty": recommendation_context.get("difficulty"),
        "createdAt": firestore.SERVER_TIMESTAMP,
    }
    ref.set(payload)
