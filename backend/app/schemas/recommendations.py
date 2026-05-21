from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.workouts import Intensity

RecommendationStrategyName = Literal["strength", "cardio_endurance", "weight_loss"]
ExperienceLevel = Literal["Beginner", "Intermediate", "Advanced"]

_NO_NUL_PATTERN = r"^[^\x00]*$"
_DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"


def _bounded_str_list(values: list[str], *, max_items: int, max_item_len: int) -> list[str]:
    if len(values) > max_items:
        raise ValueError(f"List too large (max {max_items} items).")
    for item in values:
        if not isinstance(item, str):
            raise ValueError("List items must be strings.")
        if "\x00" in item:
            raise ValueError("List items may not contain NUL bytes.")
        if len(item) > max_item_len:
            raise ValueError(f"List items too long (max {max_item_len} chars).")
    return values


class WorkoutPreferencesUpsert(BaseModel):
    preferredStrategy: RecommendationStrategyName | None = None
    experienceLevel: ExperienceLevel = "Beginner"
    availableEquipment: list[str] = Field(default_factory=list, max_length=25)
    injuries: list[str] = Field(default_factory=list, max_length=25)
    avoidExercises: list[str] = Field(default_factory=list, max_length=25)
    preferredWorkoutTypes: list[str] = Field(default_factory=list, max_length=10)
    dailyTimeBudgetMinutes: int = Field(default=30, ge=10, le=180)
    workoutDaysPerWeek: int = Field(default=3, ge=1, le=7)
    preferLowImpact: bool = False

    @field_validator("availableEquipment", "injuries", "avoidExercises", "preferredWorkoutTypes")
    @classmethod
    def _validate_lists(cls, v: list[str]) -> list[str]:
        return _bounded_str_list(v, max_items=25, max_item_len=64)


class WorkoutPreferencesOut(WorkoutPreferencesUpsert):
    id: str = Field(..., max_length=128, pattern=_NO_NUL_PATTERN)
    createdAt: str | None = None
    updatedAt: str | None = None


class RecommendedExercise(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, pattern=_NO_NUL_PATTERN)
    category: str = Field(..., min_length=1, max_length=50, pattern=_NO_NUL_PATTERN)
    durationMinutes: int = Field(..., ge=1, le=180)
    intensity: Intensity
    equipment: list[str] = Field(default_factory=list, max_length=25)
    instructions: str = Field(..., min_length=1, max_length=2_000, pattern=_NO_NUL_PATTERN)
    sets: int | None = Field(default=None, ge=1, le=20)
    reps: int | None = Field(default=None, ge=1, le=100)
    restSeconds: int | None = Field(default=None, ge=0, le=600)

    @field_validator("equipment")
    @classmethod
    def _validate_equipment(cls, v: list[str]) -> list[str]:
        return _bounded_str_list(v, max_items=25, max_item_len=64)


class WorkoutRecommendationOut(BaseModel):
    strategy: RecommendationStrategyName
    title: str = Field(..., min_length=1, max_length=200, pattern=_NO_NUL_PATTERN)
    summary: str = Field(..., min_length=1, max_length=2_000, pattern=_NO_NUL_PATTERN)
    rationale: list[str] = Field(default_factory=list, max_length=25)
    estimatedTotalMinutes: int = Field(..., ge=1, le=240)
    difficulty: ExperienceLevel
    generatedFor: str = Field(..., max_length=128, pattern=_NO_NUL_PATTERN)
    exercises: list[RecommendedExercise] = Field(default_factory=list, max_length=50)

    @field_validator("rationale")
    @classmethod
    def _validate_rationale(cls, v: list[str]) -> list[str]:
        return _bounded_str_list(v, max_items=25, max_item_len=500)


class WorkoutDayPlan(BaseModel):
    date: str = Field(..., min_length=10, max_length=10, pattern=_DATE_PATTERN)
    label: str = Field(..., min_length=1, max_length=80, pattern=_NO_NUL_PATTERN)
    focus: str = Field(..., min_length=1, max_length=120, pattern=_NO_NUL_PATTERN)
    isRestDay: bool = False
    rationale: list[str] = Field(default_factory=list, max_length=25)
    recommendation: WorkoutRecommendationOut | None = None

    @field_validator("rationale")
    @classmethod
    def _validate_day_rationale(cls, v: list[str]) -> list[str]:
        return _bounded_str_list(v, max_items=25, max_item_len=500)


class WorkoutWeekPlanOut(BaseModel):
    strategy: RecommendationStrategyName
    generatedForWeekOf: str = Field(..., min_length=10, max_length=10, pattern=_DATE_PATTERN)
    difficulty: ExperienceLevel
    weeklySummary: str = Field(..., min_length=1, max_length=2_000, pattern=_NO_NUL_PATTERN)
    weeklyRationale: list[str] = Field(default_factory=list, max_length=25)
    scheduledDays: int = Field(..., ge=0, le=7)
    recoveryDays: int = Field(..., ge=0, le=7)
    days: list[WorkoutDayPlan] = Field(default_factory=list, max_length=14)

    @field_validator("weeklyRationale")
    @classmethod
    def _validate_week_rationale(cls, v: list[str]) -> list[str]:
        return _bounded_str_list(v, max_items=25, max_item_len=500)


class WorkoutRecommendationBundle(BaseModel):
    preferences: WorkoutPreferencesOut
    recommendation: WorkoutRecommendationOut
