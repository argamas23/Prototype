from __future__ import annotations

import pytest

pytestmark = pytest.mark.anyio


class TestWorkoutRecommendationRoutes:
    async def test_get_today_recommendation_returns_wrapped_data(self, async_client, mocker):
        expected = {
            "strategy": "strength",
            "title": "Full-Body Strength Builder",
            "summary": "A balanced session.",
            "rationale": [],
            "estimatedTotalMinutes": 30,
            "difficulty": "Beginner",
            "generatedFor": "2026-04-24",
            "exercises": [],
        }
        mocker.patch("app.routes.workouts.get_today_recommendation", return_value=expected)

        response = await async_client.get("/api/v1/workouts/recommendations/today")

        assert response.status_code == 200
        assert response.json() == {"data": expected}

    async def test_get_preferences_returns_wrapped_data(self, async_client, mocker):
        expected = {
            "id": "workout",
            "experienceLevel": "Beginner",
            "availableEquipment": [],
            "injuries": [],
            "avoidExercises": [],
            "preferredWorkoutTypes": [],
            "dailyTimeBudgetMinutes": 30,
            "workoutDaysPerWeek": 3,
            "preferLowImpact": False,
            "createdAt": None,
            "updatedAt": None,
        }
        mocker.patch("app.routes.workouts.get_workout_preferences", return_value=expected)

        response = await async_client.get("/api/v1/workouts/preferences")

        assert response.status_code == 200
        assert response.json() == {"data": expected}

    async def test_get_week_recommendation_returns_wrapped_data(self, async_client, mocker):
        expected = {
            "strategy": "strength",
            "generatedForWeekOf": "2026-04-24",
            "difficulty": "Beginner",
            "weeklySummary": "A balanced week.",
            "weeklyRationale": [],
            "scheduledDays": 3,
            "recoveryDays": 4,
            "days": [],
        }
        mocker.patch("app.routes.workouts.get_weekly_recommendation", return_value=expected)

        response = await async_client.get("/api/v1/workouts/recommendations/week")

        assert response.status_code == 200
        assert response.json() == {"data": expected}

    async def test_put_preferences_returns_bundle(self, async_client, mocker):
        expected = {
            "preferences": {
                "id": "workout",
                "preferredStrategy": "weight_loss",
                "experienceLevel": "Intermediate",
                "availableEquipment": ["treadmill"],
                "injuries": [],
                "avoidExercises": [],
                "preferredWorkoutTypes": ["running"],
                "dailyTimeBudgetMinutes": 40,
                "workoutDaysPerWeek": 4,
                "preferLowImpact": False,
            },
            "recommendation": {
                "strategy": "weight_loss",
                "title": "Calorie-Burn Circuit",
                "summary": "Mixed routine.",
                "rationale": [],
                "estimatedTotalMinutes": 40,
                "difficulty": "Intermediate",
                "generatedFor": "2026-04-24",
                "exercises": [],
            },
        }
        mocker.patch("app.routes.workouts.save_preferences_and_recommend", return_value=expected)

        response = await async_client.put(
            "/api/v1/workouts/preferences",
            json={
                "preferredStrategy": "weight_loss",
                "experienceLevel": "Intermediate",
                "availableEquipment": ["treadmill"],
                "injuries": [],
                "avoidExercises": [],
                "preferredWorkoutTypes": ["running"],
                "dailyTimeBudgetMinutes": 40,
                "workoutDaysPerWeek": 4,
                "preferLowImpact": False,
            },
        )

        assert response.status_code == 200
        assert response.json() == {"data": expected}


class TestWorkoutsRoutes:
    async def test_put_workout_returns_wrapped_workout(self, async_client, mocker):
        expected = {
            "id": "wo-1",
            "workoutType": "Running",
            "date": "2026-04-14",
            "durationMinutes": 35,
            "caloriesBurned": 320.0,
            "exercises": [
                {
                    "workoutType": "Running",
                    "name": "Easy run",
                    "durationMinutes": 35,
                    "caloriesBurned": 320.0,
                    "distance": 5.5,
                    "distanceUnit": "km",
                    "notes": None,
                }
            ],
        }
        mocker.patch("app.routes.workouts.update_workout_svc", return_value=expected)

        response = await async_client.put(
            "/api/v1/workouts/wo-1",
            json={
                "workoutType": "Running",
                "date": "2026-04-14",
                "exercises": [
                    {
                        "workoutType": "Running",
                        "name": "Easy run",
                        "durationMinutes": 35,
                        "caloriesBurned": 320.0,
                        "distance": 5.5,
                        "distanceUnit": "km",
                        "notes": None,
                    }
                ],
            },
        )

        assert response.status_code == 200
        assert response.json() == {"data": expected}
