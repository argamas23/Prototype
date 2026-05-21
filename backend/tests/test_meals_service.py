from __future__ import annotations

import pytest

from app.errors import MealItemsEmpty, MealNotFound
from app.schemas.meals import LogMealRequest, MealItemIn


def _make_request(**kwargs) -> LogMealRequest:
    defaults = {
        "mealType": "Lunch",
        "date": "2026-04-11",
        "time": "12:00",
        "items": [
            MealItemIn(name="Rice", quantity=200, unit="g", calories=260, protein=5, carbs=55, fat=1)
        ],
    }
    defaults.update(kwargs)
    return LogMealRequest(**defaults)


class TestLogMeal:
    def test_raises_when_items_empty(self, mock_db, uid):
        from app.services.meals_service import log_meal

        req = _make_request(items=[])
        with pytest.raises(MealItemsEmpty) as exc_info:
            log_meal(mock_db, uid, req)
        # MealItemsEmpty inherits from ValidationError → 422 (was 400 under the
        # old HTTPException contract).
        assert exc_info.value.status_code == 422

    def test_computes_totals(self, mock_db, uid, mocker):
        from app.services.meals_service import log_meal

        # Patch repo calls so we don't need a real Firestore
        mocker.patch("app.services.meals_service.meals_ref")
        mocker.patch("app.services.meals_service.meal_items_ref")
        mocker.patch("app.services.meals_service.serialize_document", side_effect=lambda d: d)

        # Stub batch and document references
        mock_doc_ref = mocker.MagicMock()
        mock_doc_ref.id = "meal-123"
        # log_meal now denormalizes items into the meal document (fixes N+1 on
        # list), so the read-back dict includes the embedded `items` array.
        mock_doc_ref.get.return_value.to_dict.return_value = {
            "mealType": "Lunch",
            "date": "2026-04-11",
            "time": "12:00",
            "totals": {"calories": 260, "protein": 5, "carbs": 55, "fat": 1},
            "itemCount": 1,
            "items": [
                {
                    "id": "item-1",
                    "name": "Rice",
                    "quantity": 200,
                    "unit": "g",
                    "calories": 260,
                    "protein": 5,
                    "carbs": 55,
                    "fat": 1,
                }
            ],
        }
        mock_doc_ref.get.return_value.id = "meal-123"

        import app.services.meals_service as svc
        svc.meals_ref.return_value.document.return_value = mock_doc_ref
        mock_db.batch.return_value = mocker.MagicMock()

        mock_item_ref = mocker.MagicMock()
        mock_item_ref.id = "item-1"
        mock_item_ref.get.return_value.to_dict.return_value = {
            "name": "Rice", "quantity": 200, "unit": "g",
            "calories": 260, "protein": 5, "carbs": 55, "fat": 1
        }
        mock_item_ref.get.return_value.id = "item-1"
        svc.meal_items_ref.return_value.document.return_value = mock_item_ref

        req = _make_request()
        result = log_meal(mock_db, uid, req)
        assert result["id"] == "meal-123"
        assert "items" in result


class TestDeleteMeal:
    def test_raises_404_when_not_found(self, mock_db, uid, mocker):
        from app.services.meals_service import delete_meal

        mocker.patch("app.services.meals_service.get_meal_snapshot").return_value.exists = False
        with pytest.raises(MealNotFound) as exc_info:
            delete_meal(mock_db, uid, "nonexistent")
        assert exc_info.value.status_code == 404

    def test_deletes_meal_and_items(self, mock_db, uid, mocker):
        from app.services.meals_service import delete_meal

        mock_snap = mocker.MagicMock()
        mock_snap.exists = True
        mock_snap.reference = mocker.MagicMock()
        mocker.patch("app.services.meals_service.get_meal_snapshot", return_value=mock_snap)

        mock_item_snap = mocker.MagicMock()
        mock_item_snap.reference = mocker.MagicMock()
        mocker.patch("app.services.meals_service.meal_items_ref").return_value.stream.return_value = [mock_item_snap]

        mock_db.batch.return_value = mocker.MagicMock()

        result = delete_meal(mock_db, uid, "meal-123")
        assert result == {"deleted": True, "id": "meal-123"}
