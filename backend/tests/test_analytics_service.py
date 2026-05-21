from __future__ import annotations


def _make_meal_snap(mocker, meal_date: str, totals: dict):
    snap = mocker.MagicMock()
    snap.to_dict.return_value = {"date": meal_date, "totals": totals}
    return snap


def _make_workout_snap(mocker, workout_date: str, calories_burned: float):
    snap = mocker.MagicMock()
    snap.to_dict.return_value = {"date": workout_date, "caloriesBurned": calories_burned}
    return snap


class TestAnalyticsDaily:
    def test_daily_progress_sums_by_day(self, mock_db, uid, mocker):
        from app.services.analytics_service import get_daily_progress

        meal_snaps = [
            _make_meal_snap(mocker, "2026-04-10", {"calories": 400, "protein": 10, "carbs": 50, "fat": 5}),
            _make_meal_snap(mocker, "2026-04-11", {"calories": 600, "protein": 20, "carbs": 70, "fat": 10}),
        ]
        workout_snaps = [
            _make_workout_snap(mocker, "2026-04-11", 250.0),
        ]
        workout_snaps[0].to_dict.return_value.update({"durationMinutes": 45, "workoutType": "Cardio", "intensity": "Medium"})
        meal_snaps[0].to_dict.return_value.update({"mealType": "Breakfast", "itemCount": 2})
        meal_snaps[1].to_dict.return_value.update({"mealType": "Lunch", "itemCount": 1})

        mocker.patch("app.services.analytics_service.meals_ref").return_value.where.return_value.where.return_value.stream.return_value = meal_snaps
        mocker.patch("app.services.analytics_service.workouts_ref").return_value.where.return_value.where.return_value.stream.return_value = workout_snaps

        result = get_daily_progress(mock_db, uid, "2026-04-10", "2026-04-11")
        assert result["dateFrom"] == "2026-04-10"
        assert result["dateTo"] == "2026-04-11"
        assert len(result["points"]) == 2
        assert result["points"][0]["date"] == "2026-04-10"
        assert result["points"][0]["caloriesConsumed"] == 400.0
        assert result["points"][1]["caloriesConsumed"] == 600.0
        assert result["points"][1]["caloriesBurned"] == 250.0
        assert result["points"][1]["netCalories"] == 350.0
        assert result["points"][1]["workoutMinutes"] == 45.0
        assert result["points"][0]["mealItems"] == 2
        assert result["summary"]["totals"]["mealCount"] == 2
        assert result["summary"]["totals"]["workoutCount"] == 1
        assert result["summary"]["workoutsByType"]["Cardio"] == 1
        assert result["summary"]["mealsByType"]["Breakfast"] == 1
