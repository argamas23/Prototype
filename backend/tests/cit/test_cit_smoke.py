from __future__ import annotations

import pytest


pytestmark = pytest.mark.anyio


async def test_cit_health_liveness(async_client):
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_cit_metrics_endpoint_renders_prometheus_text(async_client):
    await async_client.get("/health")
    response = await async_client.get("/metrics")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "# TYPE" in response.text


async def test_cit_profile_get_smoke(async_client, mocker):
    expected = {"id": "profile-1", "fullName": "Alex"}
    svc = mocker.patch("app.routes.profile.get_profile", return_value=expected)

    response = await async_client.get("/api/v1/profile")

    assert response.status_code == 200
    assert response.json() == {"data": expected}
    assert svc.call_args.args[1] == "test-user-uid"


async def test_cit_profile_put_smoke(async_client, mocker):
    expected = {"id": "profile-1", "fullName": "Alex"}
    svc = mocker.patch("app.routes.profile.upsert_profile", return_value=expected)

    body = {
        "fullName": "Alex",
        "age": 30,
        "gender": "Other",
        "heightCm": 180,
        "weightKg": 70,
        "dietaryPreferences": [],
        "allergies": [],
    }
    response = await async_client.put("/api/v1/profile", json=body)

    assert response.status_code == 200
    assert response.json() == {"data": expected}
    assert svc.call_args.args[1] == "test-user-uid"


async def test_cit_goals_get_smoke(async_client, mocker):
    expected = {"id": "goal-1", "dailyCalories": 2000}
    svc = mocker.patch("app.routes.goals.get_goal", return_value=expected)

    response = await async_client.get("/api/v1/goals")

    assert response.status_code == 200
    assert response.json() == {"data": expected}
    assert svc.call_args.args[1] == "test-user-uid"


async def test_cit_goals_put_smoke(async_client, mocker):
    expected = {"id": "goal-1", "dailyCalories": 2000}
    svc = mocker.patch("app.routes.goals.set_goal", return_value=expected)

    body = {"dailyCalories": 2000, "protein": 0, "carbs": 0, "fat": 0, "targetWeightKg": None}
    response = await async_client.put("/api/v1/goals", json=body)

    assert response.status_code == 200
    assert response.json() == {"data": expected}
    assert svc.call_args.args[1] == "test-user-uid"


async def test_cit_dashboard_get_smoke(async_client, mocker):
    expected = {"date": "2026-01-01", "totals": {"calories": 0}}
    svc = mocker.patch("app.routes.dashboard.get_summary", return_value=expected)

    response = await async_client.get("/api/v1/dashboard?date=2026-01-01")

    assert response.status_code == 200
    assert response.json() == {"data": expected}
    assert svc.call_args.args[1] == "test-user-uid"
    assert svc.call_args.args[2] == "2026-01-01"


async def test_cit_analytics_daily_rejects_invalid_dates(async_client):
    response = await async_client.get("/api/v1/analytics/daily?dateFrom=bad&dateTo=2026-01-01")
    assert response.status_code == 400


async def test_cit_analytics_daily_rejects_large_range(async_client):
    response = await async_client.get("/api/v1/analytics/daily?dateFrom=2026-01-01&dateTo=2027-12-31")
    assert response.status_code == 400


async def test_cit_analytics_daily_accepts_valid_range(async_client, mocker):
    expected = [{"date": "2026-01-01", "calories": 0}]
    svc = mocker.patch("app.routes.analytics.get_daily_progress", return_value=expected)

    response = await async_client.get("/api/v1/analytics/daily?dateFrom=2026-01-01&dateTo=2026-01-02")

    assert response.status_code == 200
    assert response.json() == {"data": expected}
    assert svc.call_args.args[1] == "test-user-uid"


async def test_cit_plans_public_list_smoke(async_client, mocker):
    expected = [{"id": "plan-1", "name": "Beginner"}]
    mocker.patch("app.routes.plans.list_public_plans", return_value=expected)

    response = await async_client.get("/api/v1/plans")

    assert response.status_code == 200
    assert response.json() == {"data": expected}


async def test_cit_plans_admin_requires_headers(async_client):
    response = await async_client.get("/api/v1/plans/admin")
    assert response.status_code == 401


async def test_cit_workouts_preferences_get_smoke(async_client, mocker):
    expected = {"id": "prefs-1", "intensity": "moderate"}
    svc = mocker.patch("app.routes.workouts.get_workout_preferences", return_value=expected)

    response = await async_client.get("/api/v1/workouts/preferences")

    assert response.status_code == 200
    assert response.json() == {"data": expected}
    assert svc.call_args.args[1] == "test-user-uid"
