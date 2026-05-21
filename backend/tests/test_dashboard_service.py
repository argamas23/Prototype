from __future__ import annotations


def _make_meal_snap(mocker, totals: dict, meal_date: str = "2026-04-11"):
    snap = mocker.MagicMock()
    snap.to_dict.return_value = {"date": meal_date, "totals": totals}
    return snap


def _make_workout_snap(mocker, calories_burned: float, workout_date: str = "2026-04-11"):
    snap = mocker.MagicMock()
    snap.to_dict.return_value = {"date": workout_date, "caloriesBurned": calories_burned}
    return snap


class TestGetSummary:
    def test_empty_day_returns_zeros(self, mock_db, uid, mocker):
        from app.services.dashboard_service import get_summary

        mocker.patch("app.services.dashboard_service.meals_ref").return_value.where.return_value.stream.return_value = []
        mocker.patch("app.services.dashboard_service.workouts_ref").return_value.where.return_value.stream.return_value = []

        result = get_summary(mock_db, uid, "2026-04-11")
        assert result["caloriesConsumed"] == 0.0
        assert result["caloriesBurned"] == 0.0
        assert result["netCalories"] == 0.0
        assert result["mealCount"] == 0
        assert result["workoutCount"] == 0

    def test_sums_meals_and_workouts(self, mock_db, uid, mocker):
        from app.services.dashboard_service import get_summary

        meal_snaps = [
            _make_meal_snap(mocker, {"calories": 500, "protein": 30, "carbs": 60, "fat": 15}),
            _make_meal_snap(mocker, {"calories": 300, "protein": 10, "carbs": 40, "fat": 5}),
        ]
        workout_snaps = [_make_workout_snap(mocker, 250.0)]

        mocker.patch("app.services.dashboard_service.meals_ref").return_value.where.return_value.stream.return_value = meal_snaps
        mocker.patch("app.services.dashboard_service.workouts_ref").return_value.where.return_value.stream.return_value = workout_snaps

        result = get_summary(mock_db, uid, "2026-04-11")
        assert result["caloriesConsumed"] == 800.0
        assert result["caloriesBurned"] == 250.0
        assert result["netCalories"] == 550.0
        assert result["mealCount"] == 2
        assert result["workoutCount"] == 1
        assert result["macros"]["protein"] == 40.0
        assert result["macros"]["carbs"] == 100.0

    def test_net_calories_can_be_negative(self, mock_db, uid, mocker):
        from app.services.dashboard_service import get_summary

        mocker.patch("app.services.dashboard_service.meals_ref").return_value.where.return_value.stream.return_value = [
            _make_meal_snap(mocker, {"calories": 200, "protein": 0, "carbs": 0, "fat": 0})
        ]
        mocker.patch("app.services.dashboard_service.workouts_ref").return_value.where.return_value.stream.return_value = [
            _make_workout_snap(mocker, 500.0)
        ]

        result = get_summary(mock_db, uid, "2026-04-11")
        assert result["netCalories"] == -300.0

    def test_date_is_preserved_in_response(self, mock_db, uid, mocker):
        from app.services.dashboard_service import get_summary

        mocker.patch("app.services.dashboard_service.meals_ref").return_value.where.return_value.stream.return_value = []
        mocker.patch("app.services.dashboard_service.workouts_ref").return_value.where.return_value.stream.return_value = []

        result = get_summary(mock_db, uid, "2026-01-01")
        assert result["date"] == "2026-01-01"
