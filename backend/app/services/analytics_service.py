from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from firebase_admin import firestore

from app.config.cache import get_cache, user_key
from app.repositories.meals_repo import meals_ref
from app.repositories.workouts_repo import workouts_ref

_ANALYTICS_NS = "analytics"
_ANALYTICS_TTL = 60  # seconds


def invalidate_analytics(uid: str) -> None:
    """Drop all cached analytics ranges for a user after a write."""
    get_cache().invalidate_prefix(user_key(_ANALYTICS_NS, uid))


def _date_range(start: date, end: date) -> list[date]:
    days: list[date] = []
    cur = start
    while cur <= end:
        days.append(cur)
        cur = cur + timedelta(days=1)
    return days


def get_daily_progress(
    db: firestore.Client,
    uid: str,
    date_from: str,
    date_to: str,
) -> dict[str, Any]:
    cache = get_cache()
    key = user_key(_ANALYTICS_NS, uid, date_from, date_to)
    cached = cache.get(key)
    if cached is not None:
        return cached

    result = _compute_daily_progress(db, uid, date_from, date_to)
    cache.set(key, result, _ANALYTICS_TTL)
    return result


def _compute_daily_progress(
    db: firestore.Client,
    uid: str,
    date_from: str,
    date_to: str,
) -> dict[str, Any]:
    start = date.fromisoformat(date_from)
    end = date.fromisoformat(date_to)

    by_date: dict[str, dict[str, Any]] = {}
    for d in _date_range(start, end):
        ds = d.isoformat()
        by_date[ds] = {
            "date": ds,
            "caloriesConsumed": 0.0,
            "caloriesBurned": 0.0,
            "workoutMinutes": 0.0,
            "macros": {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0},
            "mealCount": 0,
            "workoutCount": 0,
            "mealItems": 0,
        }

    meals_by_type: dict[str, int] = {}
    workouts_by_type: dict[str, int] = {}

    # Meals in date range
    meal_stream = (
        meals_ref(db, uid)
        .where("date", ">=", date_from)
        .where("date", "<=", date_to)
        .stream()
    )
    for snap in meal_stream:
        data = snap.to_dict() or {}
        ds = str(data.get("date") or "")
        bucket = by_date.get(ds)
        if not bucket:
            continue
        totals = data.get("totals", {}) or {}
        calories = float(totals.get("calories", 0) or 0)
        protein = float(totals.get("protein", 0) or 0)
        carbs = float(totals.get("carbs", 0) or 0)
        fat = float(totals.get("fat", 0) or 0)
        bucket["caloriesConsumed"] += calories
        bucket["macros"]["calories"] += calories
        bucket["macros"]["protein"] += protein
        bucket["macros"]["carbs"] += carbs
        bucket["macros"]["fat"] += fat
        bucket["mealCount"] += 1
        bucket["mealItems"] += int(data.get("itemCount", 0) or 0)
        meal_type = data.get("mealType")
        if isinstance(meal_type, str) and meal_type:
            meals_by_type[meal_type] = meals_by_type.get(meal_type, 0) + 1

    # Workouts in date range
    workout_stream = (
        workouts_ref(db, uid)
        .where("date", ">=", date_from)
        .where("date", "<=", date_to)
        .stream()
    )
    for snap in workout_stream:
        data = snap.to_dict() or {}
        ds = str(data.get("date") or "")
        bucket = by_date.get(ds)
        if not bucket:
            continue
        bucket["caloriesBurned"] += float(data.get("caloriesBurned", 0) or 0)
        bucket["workoutMinutes"] += float(data.get("durationMinutes", 0) or 0)
        bucket["workoutCount"] += 1
        workout_type = data.get("workoutType")
        if isinstance(workout_type, str) and workout_type:
            workouts_by_type[workout_type] = workouts_by_type.get(workout_type, 0) + 1

    points: list[dict[str, Any]] = []
    totals = {
        "caloriesConsumed": 0.0,
        "caloriesBurned": 0.0,
        "workoutMinutes": 0.0,
        "protein": 0.0,
        "carbs": 0.0,
        "fat": 0.0,
        "mealCount": 0,
        "workoutCount": 0,
        "mealItems": 0,
    }
    days_with_meals = 0
    days_with_workouts = 0

    for ds in sorted(by_date.keys()):
        bucket = by_date[ds]
        consumed = float(bucket["caloriesConsumed"])
        burned = float(bucket["caloriesBurned"])
        minutes = float(bucket["workoutMinutes"])
        bucket["caloriesConsumed"] = round(consumed, 1)
        bucket["caloriesBurned"] = round(burned, 1)
        bucket["workoutMinutes"] = round(minutes, 1)
        bucket["netCalories"] = round(consumed - burned, 1)
        bucket["macros"] = {
            "calories": round(float(bucket["macros"]["calories"]), 1),
            "protein": round(float(bucket["macros"]["protein"]), 1),
            "carbs": round(float(bucket["macros"]["carbs"]), 1),
            "fat": round(float(bucket["macros"]["fat"]), 1),
        }
        if bucket["mealCount"] > 0:
            days_with_meals += 1
        if bucket["workoutCount"] > 0:
            days_with_workouts += 1

        totals["caloriesConsumed"] += consumed
        totals["caloriesBurned"] += burned
        totals["workoutMinutes"] += minutes
        totals["protein"] += float(bucket["macros"]["protein"])
        totals["carbs"] += float(bucket["macros"]["carbs"])
        totals["fat"] += float(bucket["macros"]["fat"])
        totals["mealCount"] += int(bucket["mealCount"])
        totals["workoutCount"] += int(bucket["workoutCount"])
        totals["mealItems"] += int(bucket["mealItems"])
        points.append(bucket)

    day_count = max(1, len(points))
    summary = {
        "days": len(points),
        "daysWithMeals": days_with_meals,
        "daysWithWorkouts": days_with_workouts,
        "totals": {
            "caloriesConsumed": round(totals["caloriesConsumed"], 1),
            "caloriesBurned": round(totals["caloriesBurned"], 1),
            "netCalories": round(totals["caloriesConsumed"] - totals["caloriesBurned"], 1),
            "workoutMinutes": round(totals["workoutMinutes"], 1),
            "protein": round(totals["protein"], 1),
            "carbs": round(totals["carbs"], 1),
            "fat": round(totals["fat"], 1),
            "mealCount": totals["mealCount"],
            "workoutCount": totals["workoutCount"],
            "mealItems": totals["mealItems"],
        },
        "averagesPerDay": {
            "caloriesConsumed": round(totals["caloriesConsumed"] / day_count, 1),
            "caloriesBurned": round(totals["caloriesBurned"] / day_count, 1),
            "netCalories": round((totals["caloriesConsumed"] - totals["caloriesBurned"]) / day_count, 1),
            "workoutMinutes": round(totals["workoutMinutes"] / day_count, 1),
        },
        "mealsByType": meals_by_type,
        "workoutsByType": workouts_by_type,
    }

    return {"dateFrom": date_from, "dateTo": date_to, "points": points, "summary": summary}
