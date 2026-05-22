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

