from __future__ import annotations

import pytest

pytestmark = pytest.mark.anyio


class TestMealsRoutes:
    async def test_log_meal_returns_wrapped_meal(self, async_client, mocker):
        expected = {
            "id": "meal-123",
            "mealType": "Lunch",
            "date": "2026-04-14",
            "time": "12:30",
            "totals": {"calories": 450.0, "protein": 20.0, "carbs": 50.0, "fat": 12.0},
            "items": [],
        }
        mocker.patch("app.routes.meals.log_meal_svc", return_value=expected)

        response = await async_client.post(
            "/api/v1/meals",
            json={
                "mealType": "Lunch",
                "date": "2026-04-14",
                "time": "12:30",
                "items": [
                    {
                        "name": "Rice",
                        "quantity": 200,
                        "unit": "g",
                        "calories": 450,
                        "protein": 20,
                        "carbs": 50,
                        "fat": 12,
                    }
                ],
            },
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        assert response.json() == {"data": expected}

    async def test_list_meals_returns_paginated_response(self, async_client, mocker):
        expected_items = [
            {
                "id": "meal-123",
                "mealType": "Breakfast",
                "date": "2026-04-14",
                "time": "08:00",
                "totals": {"calories": 300.0, "protein": 15.0, "carbs": 35.0, "fat": 8.0},
                "items": [],
            }
        ]
        mocker.patch("app.routes.meals.list_meals_svc", return_value=(expected_items, 1))

        response = await async_client.get(
            "/api/v1/meals?dateFrom=2026-04-01&dateTo=2026-04-30&page=1&pageSize=25",
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        assert response.json() == {
            "items": expected_items,
            "page": 1,
            "pageSize": 25,
            "total": 1,
            "totalPages": 1,
        }

    async def test_delete_meal_returns_wrapped_delete_status(self, async_client, mocker):
        mocker.patch("app.routes.meals.delete_meal_svc", return_value={"deleted": True, "id": "meal-123"})

        response = await async_client.delete(
            "/api/v1/meals/meal-123",
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        assert response.json() == {"data": {"deleted": True, "id": "meal-123"}}

    async def test_put_meal_returns_wrapped_meal(self, async_client, mocker):
        expected = {
            "id": "meal-123",
            "mealType": "Dinner",
            "date": "2026-04-14",
            "time": "19:00",
            "totals": {"calories": 600.0, "protein": 35.0, "carbs": 55.0, "fat": 18.0},
            "items": [],
        }
        mocker.patch("app.routes.meals.update_meal_svc", return_value=expected)

        response = await async_client.put(
            "/api/v1/meals/meal-123",
            json={
                "mealType": "Dinner",
                "date": "2026-04-14",
                "time": "19:00",
                "items": [
                    {
                        "name": "Chicken",
                        "quantity": 200,
                        "unit": "g",
                        "calories": 600,
                        "protein": 35,
                        "carbs": 55,
                        "fat": 18,
                    }
                ],
            },
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        assert response.json() == {"data": expected}
