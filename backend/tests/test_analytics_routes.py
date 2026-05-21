from __future__ import annotations

import pytest

pytestmark = pytest.mark.anyio


class TestAnalyticsRoutes:
    async def test_daily_analytics_wraps_data(self, async_client, mocker):
        mocker.patch(
            "app.routes.analytics.get_daily_progress",
            return_value={
                "dateFrom": "2026-04-01",
                "dateTo": "2026-04-02",
                "points": [],
                "summary": {"days": 2},
            },
        )

        response = await async_client.get(
            "/api/v1/analytics/daily?dateFrom=2026-04-01&dateTo=2026-04-02",
            headers={"Authorization": "Bearer test-token"},
        )
        assert response.status_code == 200
        assert response.json() == {
            "data": {
                "dateFrom": "2026-04-01",
                "dateTo": "2026-04-02",
                "points": [],
                "summary": {"days": 2},
            }
        }

    async def test_daily_analytics_rejects_invalid_date(self, async_client):
        response = await async_client.get(
            "/api/v1/analytics/daily?dateFrom=bad&dateTo=2026-04-02",
            headers={"Authorization": "Bearer test-token"},
        )
        assert response.status_code == 400
