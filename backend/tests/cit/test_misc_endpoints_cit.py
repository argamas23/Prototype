from __future__ import annotations

import pytest

pytestmark = pytest.mark.anyio


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

