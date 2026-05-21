from __future__ import annotations

from pydantic import BaseModel, Field

_DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"


class MacroTotals(BaseModel):
    calories: float = Field(..., ge=0, le=100_000)
    protein: float = Field(..., ge=0, le=10_000)
    carbs: float = Field(..., ge=0, le=10_000)
    fat: float = Field(..., ge=0, le=10_000)


class DashboardSummary(BaseModel):
    date: str = Field(..., min_length=10, max_length=10, pattern=_DATE_PATTERN)
    caloriesConsumed: float = Field(..., ge=0, le=100_000)
    caloriesBurned: float = Field(..., ge=0, le=100_000)
    netCalories: float = Field(..., ge=-100_000, le=100_000)
    macros: MacroTotals
    mealCount: int = Field(..., ge=0, le=10_000)
    workoutCount: int = Field(..., ge=0, le=10_000)
