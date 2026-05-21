from __future__ import annotations

from pydantic import BaseModel, Field

_NO_NUL_PATTERN = r"^[^\x00]*$"


class GoalCreate(BaseModel):
    dailyCalories: float = Field(..., ge=0, le=20_000)
    protein: float = Field(default=0.0, ge=0, le=10_000)
    carbs: float = Field(default=0.0, ge=0, le=10_000)
    fat: float = Field(default=0.0, ge=0, le=10_000)
    targetWeightKg: float | None = Field(default=None, ge=0, le=500)


class GoalOut(GoalCreate):
    id: str = Field(..., max_length=128, pattern=_NO_NUL_PATTERN)
    createdAt: str | None = None
    updatedAt: str | None = None
