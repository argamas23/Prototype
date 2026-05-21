from __future__ import annotations

import pytest

pytestmark = pytest.mark.anyio


class TestProfileRoutes:
    async def test_get_profile_wraps_data(self, async_client, mocker):
        mocker.patch("app.routes.profile.get_profile", return_value={"id": "main", "fullName": "Alex"})

        response = await async_client.get("/api/v1/profile", headers={"Authorization": "Bearer test-token"})
        assert response.status_code == 200
        assert response.json() == {"data": {"id": "main", "fullName": "Alex"}}

    async def test_put_profile_wraps_data(self, async_client, mocker):
        mocker.patch("app.routes.profile.upsert_profile", return_value={"id": "main", "fullName": "Alex"})

        response = await async_client.put(
            "/api/v1/profile",
            json={"fullName": "Alex", "dietaryPreferences": ["Vegetarian"], "allergies": []},
            headers={"Authorization": "Bearer test-token"},
        )
        assert response.status_code == 200
        assert response.json() == {"data": {"id": "main", "fullName": "Alex"}}
