from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

WorkoutType = Literal["Strength", "Cardio", "Yoga", "HIIT", "Swimming", "Cycling", "Running", "Other"]
DistanceUnit = Literal["km", "mi"]
WeightUnit = Literal["kg", "lb"]
ExperienceLevel = Literal["Beginner", "Intermediate", "Advanced"]
PlanStrategy = Literal["Strength", "Cardio Endurance", "Weight Loss", "Flexibility"]

_NO_NUL_PATTERN = r"^[^\x00]*$"
_EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


def _bounded_tag_list(values: list[str], *, max_items: int, max_item_len: int) -> list[str]:
    if len(values) > max_items:
        raise ValueError(f"List too large (max {max_items} items).")
    for item in values:
        if not isinstance(item, str) or not item.strip():
            raise ValueError("List items must be non-empty strings.")
        if "\x00" in item:
            raise ValueError("List items may not contain NUL bytes.")
        if len(item) > max_item_len:
            raise ValueError(f"List items too long (max {max_item_len} chars).")
    return values


class PlanExercise(BaseModel):
    workoutType: WorkoutType
    name: str = Field(..., min_length=1, max_length=100, pattern=_NO_NUL_PATTERN)
    durationMinutes: int | None = Field(default=None, ge=1, le=1_440)
    distance: float | None = Field(default=None, ge=0, le=10_000)
    distanceUnit: DistanceUnit | None = None
    sets: int | None = Field(default=None, ge=1, le=100)
    repsPerSet: int | None = Field(default=None, ge=1, le=1_000)
    weight: float | None = Field(default=None, ge=0, le=5_000)
    weightUnit: WeightUnit | None = None

    @model_validator(mode="after")
    def _validate_measurements(self) -> "PlanExercise":
        has_duration = self.durationMinutes is not None
        has_distance = self.distance is not None
        has_strength = self.sets is not None or self.repsPerSet is not None or self.weight is not None

        if self.workoutType == "Strength":
            if self.sets is None or self.repsPerSet is None or self.weight is None:
                raise ValueError("Strength exercises require sets, repsPerSet, and weight.")
        elif self.workoutType == "Yoga":
            if self.durationMinutes is None:
                raise ValueError("Yoga exercises require durationMinutes.")
        elif self.workoutType in ("Cardio", "Swimming", "Cycling", "Running"):
            if self.durationMinutes is None or self.distance is None:
                raise ValueError(f"{self.workoutType} exercises require durationMinutes and distance.")
        elif self.workoutType == "HIIT":
            if self.sets is None or self.repsPerSet is None or self.weight is None or self.durationMinutes is None:
                raise ValueError("HIIT exercises require sets, repsPerSet, weight, and durationMinutes.")
        elif not (has_duration or has_distance or has_strength):
            raise ValueError("Provide at least one measurement: durationMinutes, distance, or sets/reps/weight.")

        if self.distance is not None and self.distanceUnit is None:
            raise ValueError("distanceUnit is required when distance is provided.")
        if self.distance is None and self.distanceUnit is not None:
            raise ValueError("distance is required when distanceUnit is provided.")
        if self.sets is not None and self.repsPerSet is None:
            raise ValueError("repsPerSet is required when sets is provided.")
        if self.repsPerSet is not None and self.sets is None:
            raise ValueError("sets is required when repsPerSet is provided.")
        if self.weight is not None and self.weightUnit is None:
            raise ValueError("weightUnit is required when weight is provided.")
        if self.weight is None and self.weightUnit is not None:
            raise ValueError("weight is required when weightUnit is provided.")
        return self


class WorkoutPlanIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, pattern=_NO_NUL_PATTERN)
    strategy: PlanStrategy
    experience: list[ExperienceLevel] = Field(..., min_length=1, max_length=3)
    ageMin: int = Field(default=12, ge=0, le=125)
    ageMax: int = Field(default=100, ge=0, le=125)
    daysPerWeek: int = Field(default=3, ge=1, le=7)
    totalMinutes: int = Field(default=30, ge=1, le=1_440)
    equipment: list[str] = Field(default_factory=list, max_length=25)
    workoutTypes: list[str] = Field(default_factory=list, max_length=25)
    constraintsToAvoid: list[str] = Field(default_factory=list, max_length=25)
    summary: str = Field(default="", max_length=500)
    exercises: list[PlanExercise] = Field(..., min_length=1, max_length=50)

    @field_validator("equipment", "workoutTypes", "constraintsToAvoid")
    @classmethod
    def _validate_tag_lists(cls, v: list[str]) -> list[str]:
        return _bounded_tag_list(v, max_items=25, max_item_len=64)

    @model_validator(mode="after")
    def _validate_age_range(self) -> "WorkoutPlanIn":
        if self.ageMax < self.ageMin:
            raise ValueError("ageMax must be greater than or equal to ageMin.")
        return self


class WorkoutPlanOut(WorkoutPlanIn):
    id: str = Field(..., max_length=128, pattern=_NO_NUL_PATTERN)
    ownerEmail: str = Field(..., max_length=254, pattern=_EMAIL_PATTERN)
    createdAt: str | None = None
    updatedAt: str | None = None
