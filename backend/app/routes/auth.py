from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.config.rate_limit import limiter
from app.config.security import AuthUser, get_current_user
from app.schemas.common import data_response

router = APIRouter()


@router.post("/auth")
@limiter.limit("10/minute")
async def auth(
    request: Request,
    user: AuthUser = Depends(get_current_user),
) -> dict:
    return data_response({"uid": user.uid, "email": user.email})

