from __future__ import annotations

import pytest

pytestmark = pytest.mark.anyio


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

