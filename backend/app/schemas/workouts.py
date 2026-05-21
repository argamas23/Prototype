from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

WorkoutType = Literal["Strength", "Cardio", "Yoga", "HIIT", "Swimming", "Cycling", "Running", "Other"]
Intensity = Literal["Low", "Medium", "High"]
DistanceUnit = Literal["km", "mi"]
WeightUnit = Literal["kg", "lb"]

_NO_NUL_PATTERN = r"^[^\x00]*$"
_DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"


class RecommendationContextIn(BaseModel):
    strategy: Literal["strength", "cardio_endurance", "weight_loss"]
    difficulty: Literal["Beginner", "Intermediate", "Advanced"] | None = None
    generatedFor: str | None = Field(default=None, max_length=128, pattern=_NO_NUL_PATTERN)
    title: str | None = Field(default=None, max_length=200, pattern=_NO_NUL_PATTERN)
    followedAsRecommended: bool = True


class WorkoutExerciseIn(BaseModel):
    workoutType: WorkoutType
    name: str = Field(..., min_length=1, max_length=100, pattern=_NO_NUL_PATTERN)
    caloriesBurned: float = Field(default=0.0, ge=0, le=100_000)
    notes: str | None = Field(default=None, max_length=500, pattern=_NO_NUL_PATTERN)

    # Measurement options (provide at least one).
    durationMinutes: int | None = Field(default=None, ge=1, le=1_440)
    distance: float | None = Field(default=None, ge=0, le=10_000)
    distanceUnit: DistanceUnit | None = None

    sets: int | None = Field(default=None, ge=1, le=100)
    repsPerSet: int | None = Field(default=None, ge=1, le=1_000)
    weight: float | None = Field(default=None, ge=0, le=5_000)
    weightUnit: WeightUnit | None = None

    @model_validator(mode="after")
    def _validate_measurement(self) -> "WorkoutExerciseIn":
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
        else:
            if not (has_duration or has_distance or has_strength):
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


class LogWorkoutRequest(BaseModel):
    workoutType: WorkoutType | None = None
    date: str = Field(..., min_length=10, max_length=10, pattern=_DATE_PATTERN)  # YYYY-MM-DD
    # New format (preferred): log one session with multiple exercises.
    exercises: list[WorkoutExerciseIn] | None = None

    # Legacy format: single-session totals (kept for backward compatibility).
    durationMinutes: int | None = Field(default=None, ge=1, le=1_440)
    intensity: Intensity | None = None
    caloriesBurned: float = Field(default=0.0, ge=0, le=100_000)
    notes: str | None = Field(default=None, max_length=500, pattern=_NO_NUL_PATTERN)
    recommendationContext: RecommendationContextIn | None = None

    @model_validator(mode="after")
    def _validate_shape(self) -> "LogWorkoutRequest":
        if self.exercises and len(self.exercises) > 0:
            return self
        if self.workoutType is None:
            raise ValueError("workoutType is required when exercises[] is not provided.")
        if self.durationMinutes is None or self.intensity is None:
            raise ValueError("Provide either exercises[] or durationMinutes + intensity.")
        return self


class WorkoutOut(LogWorkoutRequest):
    id: str = Field(..., max_length=128, pattern=_NO_NUL_PATTERN)
    createdAt: str | None = None
