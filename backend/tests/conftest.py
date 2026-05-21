from __future__ import annotations

import os

import pytest
import httpx


@pytest.fixture
def mock_db(mocker):
    """Return a MagicMock that quacks like a Firestore client."""
    return mocker.MagicMock()


@pytest.fixture
def uid():
    return "test-user-uid"


@pytest.fixture(autouse=True)
def _reset_process_cache():
    # `get_cache` is `@lru_cache`-d, so the in-memory TTL cache is shared
    # across tests in the same process. Dashboard/analytics tests would
    # otherwise see stale cached summaries from an earlier test's inputs.
    # Clear before AND after so the first test of the run starts clean too.
    from app.config.cache import get_cache

    get_cache.cache_clear()
    yield
    get_cache.cache_clear()


@pytest.fixture(autouse=True)
def _disable_firebase_init(mocker):
    # Tests should not require real Firebase credentials or network access.
    mocker.patch("app.config.firebase.ensure_firebase_app")


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def async_client(mocker) -> httpx.AsyncClient:
    os.environ["FIREBASE_PROJECT_ID"] = "test-project"
    os.environ["FIREBASE_STORAGE_BUCKET"] = "test-project.appspot.com"
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "security/test-service-account.json"

    from app.config.firebase import get_firestore_client
    from app.config.security import AuthUser
    from app.config.security import get_current_user
    from app.main import app

    app.dependency_overrides.clear()

    async def _current_user() -> AuthUser:
        return AuthUser(uid="test-user-uid", email="test@example.com")

    async def _firestore_client():
        return mocker.MagicMock()

    app.dependency_overrides[get_current_user] = _current_user
    app.dependency_overrides[get_firestore_client] = _firestore_client

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
