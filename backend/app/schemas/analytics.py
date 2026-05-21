from __future__ import annotations

from pydantic import BaseModel, Field

_DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"


class DailyProgressPoint(BaseModel):
    date: str = Field(..., min_length=10, max_length=10, pattern=_DATE_PATTERN)  # YYYY-MM-DD
    caloriesConsumed: float = Field(default=0.0, ge=0, le=100_000)
    caloriesBurned: float = Field(default=0.0, ge=0, le=100_000)
    netCalories: float = Field(..., ge=-100_000, le=100_000)
    macros: dict[str, float]
    mealCount: int = Field(default=0, ge=0, le=10_000)
    workoutCount: int = Field(default=0, ge=0, le=10_000)
    workoutMinutes: float = Field(default=0.0, ge=0, le=10_000)
    mealItems: int = Field(default=0, ge=0, le=100_000)


class DailyProgressResponse(BaseModel):
    dateFrom: str = Field(..., min_length=10, max_length=10, pattern=_DATE_PATTERN)
    dateTo: str = Field(..., min_length=10, max_length=10, pattern=_DATE_PATTERN)
    points: list[DailyProgressPoint]
    summary: dict
