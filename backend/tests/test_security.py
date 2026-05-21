from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials


class TestGetCurrentUser:
    def test_returns_authenticated_user(self, mocker):
        from app.config.security import get_current_user

        mocker.patch("app.config.security.ensure_firebase_app")
        mocker.patch(
            "app.config.security.auth.verify_id_token",
            return_value={"uid": "user-123", "email": "user@example.com"},
        )

        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="valid-token")
        user = asyncio.run(get_current_user(credentials))

        assert user.uid == "user-123"
        assert user.email == "user@example.com"

    def test_rejects_missing_token(self):
        from app.config.security import get_current_user

        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(get_current_user(None))

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Missing bearer token"
        assert exc_info.value.headers == {"WWW-Authenticate": "Bearer"}

    def test_rejects_non_bearer_scheme(self):
        from app.config.security import get_current_user

        credentials = HTTPAuthorizationCredentials(scheme="Basic", credentials="abc123")

        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(get_current_user(credentials))

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Missing bearer token"
        assert exc_info.value.headers == {"WWW-Authenticate": "Bearer"}

    def test_rejects_invalid_token(self, mocker):
        from app.config.security import get_current_user

        mocker.patch("app.config.security.ensure_firebase_app")
        mocker.patch("app.config.security.auth.verify_id_token", side_effect=ValueError("bad token"))

        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid-token")

        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(get_current_user(credentials))

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid token"
        assert exc_info.value.headers == {"WWW-Authenticate": "Bearer"}
