from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

from app.config.firebase import ensure_firebase_app

security_scheme = HTTPBearer(auto_error=False, bearerFormat="JWT")


class AuthUser(dict):
    @property
    def uid(self) -> str:
        return self["uid"]

    @property
    def email(self) -> str | None:
        return self.get("email")


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> AuthUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("Missing bearer token")
    ensure_firebase_app()
    try:
        decoded: dict[str, Any] = auth.verify_id_token(credentials.credentials)
    except Exception as exc:  # pragma: no cover - passthrough
        raise _unauthorized("Invalid token") from exc
    return AuthUser(uid=decoded["uid"], email=decoded.get("email"))
