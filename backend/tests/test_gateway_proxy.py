from __future__ import annotations

import pytest

pytestmark = pytest.mark.anyio


class TestRequestIdMiddleware:
    async def test_generates_request_id_when_missing(self, async_client):
        response = await async_client.get("/health")

        assert response.status_code == 200
        request_id = response.headers.get("x-request-id")
        assert request_id is not None
        assert len(request_id) == 32
        int(request_id, 16)

    async def test_reuses_incoming_request_id_header(self, async_client):
        response = await async_client.get(
            "/health", headers={"x-request-id": "req-from-client"}
        )

        assert response.status_code == 200
        assert response.headers.get("x-request-id") == "req-from-client"
