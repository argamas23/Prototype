from __future__ import annotations

import pytest

pytestmark = pytest.mark.anyio


class TestPlansRoutes:
    async def test_public_plans_returns_wrapped_data(self, async_client, mocker):
        expected = [{"id": "plan-1", "title": "Calisthenics for beginners"}]
        mocker.patch("app.routes.plans.list_public_plans", return_value=expected)

        response = await async_client.get("/api/v1/plans")

        assert response.status_code == 200
        assert response.json() == {"data": expected}

    async def test_admin_plans_require_plan_admin_headers(self, async_client):
        response = await async_client.get("/api/v1/plans/admin")

        assert response.status_code == 401

    async def test_admin_plans_returns_only_admin_plans(self, async_client, mocker):
        expected = [{"id": "plan-1", "ownerEmail": "planAdmin@gmail.com"}]
        list_plans = mocker.patch("app.routes.plans.list_admin_plans", return_value=expected)

        response = await async_client.get(
            "/api/v1/plans/admin",
            headers={
                "X-Plan-Admin-Email": "planAdmin@gmail.com",
                "X-Plan-Admin-Token": "healthsync-plan-admin",
            },
        )

        assert response.status_code == 200
        assert response.json() == {"data": expected}
        list_plans.assert_called_once()
