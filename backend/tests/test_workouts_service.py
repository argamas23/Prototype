from __future__ import annotations

import pytest

from app.errors import WorkoutNotFound
from app.schemas.workouts import LogWorkoutRequest


def _make_request(**kwargs) -> LogWorkoutRequest:
    defaults = {
        "workoutType": "Running",
        "date": "2026-04-11",
        "exercises": [
            {
                "workoutType": "Running",
                "name": "Easy run",
                "durationMinutes": 30,
                "caloriesBurned": 300.0,
                "distance": 5.0,
                "distanceUnit": "km",
                "notes": None,
            }
        ],
    }
    defaults.update(kwargs)
    return LogWorkoutRequest(**defaults)


class TestLogWorkout:
    def test_stores_workout_and_returns_id(self, mock_db, uid, mocker):
        from app.services.workouts_service import log_workout

        mocker.patch("app.services.workouts_service.workouts_ref")
        mocker.patch("app.services.workouts_service.serialize_document", side_effect=lambda d: d)
        mock_append_history = mocker.patch("app.services.workouts_service.append_activity_history_entry")

        mock_doc_ref = mocker.MagicMock()
        mock_doc_ref.id = "wo-1"
        mock_doc_ref.get.return_value.to_dict.return_value = {
            "workoutType": "Running",
            "date": "2026-04-11",
            "durationMinutes": 30,
            "caloriesBurned": 300.0,
            "exercises": [
                {
                    "workoutType": "Running",
                    "name": "Easy run",
                    "durationMinutes": 30,
                    "caloriesBurned": 300.0,
                    "distance": 5.0,
                    "distanceUnit": "km",
                    "notes": None,
                }
            ],
        }
        mock_doc_ref.get.return_value.id = "wo-1"

        import app.services.workouts_service as svc
        svc.workouts_ref.return_value.document.return_value = mock_doc_ref

        result = log_workout(mock_db, uid, _make_request())
        assert result["id"] == "wo-1"
        mock_append_history.assert_called_once()

    def test_calories_burned_defaults_to_zero(self):
        req = _make_request(exercises=[{"workoutType": "Yoga", "name": "Walk", "durationMinutes": 10}])
        assert req.exercises is not None
        assert req.exercises[0].caloriesBurned == 0.0

    def test_duration_must_be_positive(self):
        with pytest.raises(Exception):
            _make_request(exercises=[{"workoutType": "Yoga", "name": "Run", "durationMinutes": 0}])


class TestDeleteWorkout:
    def test_raises_404_when_not_found(self, mock_db, uid, mocker):
        from app.services.workouts_service import delete_workout

        mocker.patch("app.services.workouts_service.get_workout_snapshot").return_value.exists = False
        with pytest.raises(WorkoutNotFound) as exc_info:
            delete_workout(mock_db, uid, "nonexistent")
        assert exc_info.value.status_code == 404

    def test_deletes_workout(self, mock_db, uid, mocker):
        from app.services.workouts_service import delete_workout

        mock_snap = mocker.MagicMock()
        mock_snap.exists = True
        mocker.patch("app.services.workouts_service.get_workout_snapshot", return_value=mock_snap)

        result = delete_workout(mock_db, uid, "wo-1")
        assert result == {"deleted": True, "id": "wo-1"}
        mock_snap.reference.delete.assert_called_once()
