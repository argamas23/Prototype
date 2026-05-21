from __future__ import annotations

import asyncio
from typing import Any

from firebase_admin import firestore

from app.config.config import get_settings  # noqa: F401 — re-exported for callers
from app.errors import (
    ImageRecognitionFailed,
    MealItemsEmpty,
    MealNotFound,
    NoFoodDetected,
)
from app.repositories.meals_repo import get_meal_snapshot, meal_items_ref, meals_ref
from app.schemas.meals import LogMealRequest, MealItemIn
from app.services.analytics_service import invalidate_analytics
from app.services.dashboard_service import invalidate_dashboard
from app.services.image_recognition import FineTunedFoodRecognizer
from app.services.nutrition import resolve_nutrition
from app.utils.firestore import serialize_document


# Reuse the recognizer between requests to avoid repeated ONNX loading.
_RECOGNIZER: FineTunedFoodRecognizer | None = None


def _get_recognizer() -> FineTunedFoodRecognizer:
    global _RECOGNIZER
    if _RECOGNIZER is None:
        _RECOGNIZER = FineTunedFoodRecognizer()
    return _RECOGNIZER


def log_meal(db: firestore.Client, uid: str, body: LogMealRequest) -> dict[str, Any]:
    if not body.items:
        raise MealItemsEmpty("Items cannot be empty")

    totals = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
    for item in body.items:
        totals["calories"] += item.calories
        totals["protein"] += item.protein
        totals["carbs"] += item.carbs
        totals["fat"] += item.fat

    meal_ref = meals_ref(db, uid).document()

    # Denormalized embed: items live inside the meal document so `list_meals`
    # can return them without an extra Firestore read per meal (fixes N+1).
    # We also mirror them into the `items` sub-collection so per-item queries
    # (future feature: search by food name) remain possible without a migration.
    embedded_items: list[dict[str, Any]] = []
    batch = db.batch()
    for item in body.items:
        item_ref = meal_items_ref(db, uid, meal_ref.id).document()
        item_payload = item.model_dump()
        batch.set(item_ref, item_payload)
        embedded_items.append({**item_payload, "id": item_ref.id})

    meal_payload = {
        "mealType": body.mealType,
        "date": body.date.isoformat(),
        "time": body.time.strftime("%H:%M"),
        "totals": totals,
        "itemCount": len(body.items),
        "items": embedded_items,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }
    batch.set(meal_ref, meal_payload)
    batch.commit()

    invalidate_dashboard(uid, body.date.isoformat())
    invalidate_analytics(uid)

    meal_snap = meal_ref.get()
    meal_data = meal_snap.to_dict() or {}
    meal_data["id"] = meal_snap.id
    return serialize_document(meal_data)


def update_meal(db: firestore.Client, uid: str, meal_id: str, body: LogMealRequest) -> dict[str, Any]:
    if not body.items:
        raise MealItemsEmpty("Items cannot be empty")

    snap = get_meal_snapshot(db, uid, meal_id)
    if not snap.exists:
        raise MealNotFound(f"Meal {meal_id} not found")

    totals = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
    for item in body.items:
        totals["calories"] += item.calories
        totals["protein"] += item.protein
        totals["carbs"] += item.carbs
        totals["fat"] += item.fat

    meal_ref = meals_ref(db, uid).document(meal_id)

    # Replace embedded items + mirror subcollection for compatibility / future queries.
    embedded_items: list[dict[str, Any]] = []
    batch = db.batch()
    for item_snap in meal_items_ref(db, uid, meal_id).stream():
        batch.delete(item_snap.reference)
    for item in body.items:
        item_ref = meal_items_ref(db, uid, meal_ref.id).document()
        item_payload = item.model_dump()
        batch.set(item_ref, item_payload)
        embedded_items.append({**item_payload, "id": item_ref.id})

    meal_payload = {
        "mealType": body.mealType,
        "date": body.date.isoformat(),
        "time": body.time.strftime("%H:%M"),
        "totals": totals,
        "itemCount": len(body.items),
        "items": embedded_items,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }
    batch.update(meal_ref, meal_payload)
    batch.commit()

    invalidate_dashboard(uid, body.date.isoformat())
    invalidate_analytics(uid)

    meal_snap = meal_ref.get()
    meal_data = meal_snap.to_dict() or {}
    meal_data["id"] = meal_snap.id
    return serialize_document(meal_data)


def list_meals(
    db: firestore.Client,
    uid: str,
    date_from: str | None,
    date_to: str | None,
    page: int,
    page_size: int,
) -> tuple[list[dict[str, Any]], int]:
    # Push date filtering into Firestore instead of streaming-then-discarding.
    query = meals_ref(db, uid)
    if date_from:
        query = query.where("date", ">=", date_from)
    if date_to:
        query = query.where("date", "<=", date_to)
    query = query.order_by("date", direction=firestore.Query.DESCENDING)

    results: list[dict[str, Any]] = []
    for snap in query.stream():
        data = snap.to_dict() or {}
        data["id"] = snap.id
        data = serialize_document(data)
        if "items" not in data:
            # Backward-compat read path: legacy meals without embedded items.
            # New writes denormalize items into the meal doc (see log_meal),
            # so this fallback only fires for rows created before the fix.
            item_snaps = list(meal_items_ref(db, uid, snap.id).stream())
            data["items"] = [
                serialize_document({**(isnap.to_dict() or {}), "id": isnap.id})
                for isnap in item_snaps
            ]
        results.append(data)

    total = len(results)
    start = (page - 1) * page_size
    return results[start : start + page_size], total


def delete_meal(db: firestore.Client, uid: str, meal_id: str) -> dict[str, Any]:
    snap = get_meal_snapshot(db, uid, meal_id)
    if not snap.exists:
        raise MealNotFound(f"Meal {meal_id} not found")

    meal_data = snap.to_dict() or {}
    batch = db.batch()
    for item_snap in meal_items_ref(db, uid, meal_id).stream():
        batch.delete(item_snap.reference)
    batch.delete(snap.reference)
    batch.commit()

    invalidate_dashboard(uid, str(meal_data.get("date") or ""))
    invalidate_analytics(uid)
    return {"deleted": True, "id": meal_id}


async def analyze_image(image_data: bytes) -> list[MealItemIn]:
    """Run ONNX food recognition and enrich each prediction with nutrition.

    Accepts raw bytes — the route layer reads the upload before calling in, so
    this service has no FastAPI dependency and can be reused (CLI seeding,
    batch jobs, future gRPC facade).
    """
    recognizer = _get_recognizer()
    try:
        # ONNX inference is CPU-bound and blocks the event loop if run inline.
        # Offload to the default thread-pool so one slow inference doesn't stall
        # unrelated requests served by the same uvicorn worker.
        results = await asyncio.to_thread(recognizer.predict, image_data, 3)
    except Exception as exc:
        raise ImageRecognitionFailed(f"Image recognition failed: {exc}") from exc

    if not results:
        raise NoFoodDetected("No food items detected. Please upload a clearer image.")

    items: list[MealItemIn] = []
    for result in results:
        label = result.get("label") or f"class_{result.get('class_index')}"
        nutrition = resolve_nutrition(label)
        items.append(
            MealItemIn(
                name=label,
                quantity=1,
                unit="serving",
                calories=nutrition["calories"],
                protein=nutrition["protein"],
                carbs=nutrition["carbs"],
                fat=nutrition["fat"],
            )
        )
    return items
