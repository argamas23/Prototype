from __future__ import annotations


class TestWorkoutPreferencesService:
    def test_returns_defaults_when_preferences_missing(self, mock_db, uid, mocker):
        from app.services.recommendations_service import get_workout_preferences

        mock_snap = mocker.MagicMock()
        mock_snap.exists = False
        mocker.patch("app.services.recommendations_service.workout_preferences_ref").return_value.get.return_value = mock_snap

        result = get_workout_preferences(mock_db, uid)

        assert result["id"] == "workout"
        assert result["dailyTimeBudgetMinutes"] == 30
        assert result["experienceLevel"] == "Beginner"

    def test_upsert_preferences_returns_saved_document(self, mock_db, uid, mocker):
        from app.schemas.recommendations import WorkoutPreferencesUpsert
        from app.services.recommendations_service import upsert_workout_preferences

        ref = mocker.MagicMock()
        existing = mocker.MagicMock()
        existing.exists = False
        ref.get.side_effect = [existing]
        mocker.patch("app.services.recommendations_service.workout_preferences_ref", return_value=ref)
        mocker.patch(
            "app.services.recommendations_service.get_workout_preferences",
            return_value={"id": "workout", "experienceLevel": "Intermediate", "dailyTimeBudgetMinutes": 45},
        )

        result = upsert_workout_preferences(
            mock_db,
            uid,
            WorkoutPreferencesUpsert(experienceLevel="Intermediate", dailyTimeBudgetMinutes=45),
        )

        assert result["experienceLevel"] == "Intermediate"
        ref.set.assert_called_once()

    def test_get_weekly_recommendation_returns_serialized_week_plan(self, mock_db, uid, mocker):
        from app.services.recommendations_service import get_weekly_recommendation

        mock_context = mocker.MagicMock()
        mocker.patch("app.services.recommendations_service.build_recommendation_context", return_value=mock_context)
        mocker.patch(
            "app.services.recommendations_service.RecommendationEngine"
        ).return_value.generate_week.return_value.model_dump.return_value = {
            "strategy": "strength",
            "generatedForWeekOf": "2026-04-24",
            "difficulty": "Beginner",
            "weeklySummary": "Summary",
            "weeklyRationale": [],
            "scheduledDays": 3,
            "recoveryDays": 4,
            "days": [],
        }

        result = get_weekly_recommendation(mock_db, uid)

        assert result["scheduledDays"] == 3
