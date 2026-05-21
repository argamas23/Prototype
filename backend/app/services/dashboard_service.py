from __future__ import annotations

from typing import Any

from firebase_admin import firestore

from app.config.cache import get_cache, user_key
from app.repositories.meals_repo import meals_ref
from app.repositories.workouts_repo import workouts_ref

_DASHBOARD_NS = "dashboard"
_DASHBOARD_TTL = 30  # seconds — short enough that stale data is rare, long enough to absorb bursts


def invalidate_dashboard(uid: str, date: str | None = None) -> None:
    """Call after a meal/workout write to drop the user's cached summary."""
    cache = get_cache()
    if date:
        cache.invalidate(user_key(_DASHBOARD_NS, uid, date))
    else:
        cache.invalidate_prefix(user_key(_DASHBOARD_NS, uid))


def get_summary(db: firestore.Client, uid: str, date: str) -> dict[str, Any]:
    cache = get_cache()
    key = user_key(_DASHBOARD_NS, uid, date)
    cached = cache.get(key)
    if cached is not None:
        return cached

    result = _compute_summary(db, uid, date)
    cache.set(key, result, _DASHBOARD_TTL)
    return result


def _compute_summary(db: firestore.Client, uid: str, date: str) -> dict[str, Any]:
    # Aggregate meals for the given date
    meal_docs = list(
        meals_ref(db, uid).where("date", "==", date).stream()
    )
    calories_consumed = 0.0
    protein = 0.0
    carbs = 0.0
    fat = 0.0
    meal_count = len(meal_docs)

    for snap in meal_docs:
        data = snap.to_dict() or {}
        totals = data.get("totals", {})
        calories_consumed += float(totals.get("calories", 0))
        protein += float(totals.get("protein", 0))
        carbs += float(totals.get("carbs", 0))
        fat += float(totals.get("fat", 0))

    # Aggregate workouts for the given date
    workout_docs = list(
        workouts_ref(db, uid).where("date", "==", date).stream()
    )
    calories_burned = 0.0
    workout_count = len(workout_docs)

    for snap in workout_docs:
        data = snap.to_dict() or {}
        calories_burned += float(data.get("caloriesBurned", 0))

    return {
        "date": date,
        "caloriesConsumed": round(calories_consumed, 1),
        "caloriesBurned": round(calories_burned, 1),
        "netCalories": round(calories_consumed - calories_burned, 1),
        "macros": {
            "calories": round(calories_consumed, 1),
            "protein": round(protein, 1),
            "carbs": round(carbs, 1),
            "fat": round(fat, 1),
        },
        "mealCount": meal_count,
        "workoutCount": workout_count,
    }
