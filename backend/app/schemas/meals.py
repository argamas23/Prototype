from __future__ import annotations

from datetime import date, time
from typing import Literal

from pydantic import BaseModel, Field, field_serializer

MealType = Literal["Breakfast", "Lunch", "Dinner", "Snacks"]

_NO_NUL_PATTERN = r"^[^\x00]*$"
_TIME_PATTERN = r"^\d{2}:\d{2}$"
_DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"


class MealItemIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, pattern=_NO_NUL_PATTERN)
    quantity: float = Field(..., ge=0, le=100_000)
    unit: str = Field(..., min_length=1, max_length=32, pattern=_NO_NUL_PATTERN)
    calories: float = Field(..., ge=0, le=100_000)
    protein: float = Field(default=0.0, ge=0, le=10_000)
    carbs: float = Field(default=0.0, ge=0, le=10_000)
    fat: float = Field(default=0.0, ge=0, le=10_000)


class LogMealRequest(BaseModel):
    mealType: MealType
    date: date
    time: time
    items: list[MealItemIn] = Field(..., max_length=100)

    @field_serializer("date")
    def serialize_date(self, value: date) -> str:
        return value.isoformat()

    @field_serializer("time")
    def serialize_time(self, value: time) -> str:
        return value.strftime("%H:%M")


class MealItemOut(MealItemIn):
    id: str = Field(..., max_length=128, pattern=_NO_NUL_PATTERN)


class MealOut(BaseModel):
    id: str = Field(..., max_length=128, pattern=_NO_NUL_PATTERN)
    mealType: MealType
    date: str = Field(..., min_length=10, max_length=10, pattern=_DATE_PATTERN)
    time: str = Field(..., min_length=5, max_length=5, pattern=_TIME_PATTERN)
    totals: dict[str, float]
    items: list[MealItemOut] = Field(..., max_length=100)
    createdAt: str | None = None
