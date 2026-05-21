from __future__ import annotations

from app.schemas.recommendations import WorkoutPreferencesOut
from app.services.recommendation_engine import (
    EquipmentAvailabilityFilter,
    ExperienceLevelFilter,
    RecommendationContext,
    RecommendationEngine,
    SafetyFilter,
)


def _context(**overrides) -> RecommendationContext:
    defaults = {
        "profile": {"weightKg": 82, "heightCm": 175, "age": 29, "gender": "Male"},
        "goal": {"targetWeightKg": 75},
        "preferences": WorkoutPreferencesOut(
            id="workout",
            preferredStrategy=None,
            experienceLevel="Beginner",
            availableEquipment=[],
            injuries=[],
            avoidExercises=[],
            preferredWorkoutTypes=[],
            dailyTimeBudgetMinutes=30,
            workoutDaysPerWeek=3,
            preferLowImpact=False,
            createdAt=None,
            updatedAt=None,
        ),
        "activity_history": [],
        "today": "2026-04-24",
    }
    defaults.update(overrides)
    return RecommendationContext(**defaults)


class TestRecommendationEngine:
    def test_prefers_explicit_strategy(self):
        ctx = _context(
            preferences=_context().preferences.model_copy(update={"preferredStrategy": "cardio_endurance"})
        )

        result = RecommendationEngine().generate(ctx)

        assert result.strategy == "cardio_endurance"

    def test_switches_to_weight_loss_for_lower_target_weight(self):
        result = RecommendationEngine().generate(_context())

        assert result.strategy == "weight_loss"

    def test_uses_cardio_when_preferred_types_indicate_endurance(self):
        ctx = _context(
            goal=None,
            preferences=_context().preferences.model_copy(
                update={"preferredWorkoutTypes": ["Running"], "preferredStrategy": None}
            ),
        )

        result = RecommendationEngine().generate(ctx)

        assert result.strategy == "cardio_endurance"

    def test_generates_week_plan_with_requested_training_days_when_data_is_complete(self):
        result = RecommendationEngine().generate_week(
            _context(
                preferences=_context().preferences.model_copy(
                    update={"preferredStrategy": "strength", "workoutDaysPerWeek": 4}
                )
            )
        )

        assert result.strategy == "strength"
        assert len(result.days) == 7
        assert result.scheduledDays == 4
        assert sum(0 if day.isRestDay else 1 for day in result.days) == 4

    def test_week_plan_falls_back_to_conservative_volume_when_profile_data_is_missing(self):
        result = RecommendationEngine().generate_week(
            _context(
                profile={"weightKg": 82},
                goal=None,
                preferences=_context().preferences.model_copy(
                    update={"preferredStrategy": "weight_loss", "workoutDaysPerWeek": 5}
                ),
            )
        )

        assert result.strategy == "weight_loss"
        assert result.scheduledDays == 3


class TestRecommendationFilters:
    def test_filter_chain_removes_unsafe_and_unavailable_exercises(self):
        ctx = _context(
            preferences=_context().preferences.model_copy(
                update={
                    "injuries": ["knee"],
                    "availableEquipment": [],
                    "preferredStrategy": "strength",
                }
            )
        )
        chain = SafetyFilter()
        chain.set_next(EquipmentAvailabilityFilter()).set_next(ExperienceLevelFilter())

        result = RecommendationEngine(filter_chain=chain).generate(ctx)

        names = [item.name for item in result.exercises]
        assert "Goblet Squat" not in names
        assert "Bent-Over Row" not in names
        assert "Push-Up" in names

    def test_beginner_filter_caps_intensity_and_duration(self):
        ctx = _context(
            goal=None,
            preferences=_context().preferences.model_copy(
                update={"preferredStrategy": "cardio_endurance", "dailyTimeBudgetMinutes": 70}
            ),
            activity_history=[{"completed": True}] * 8,
        )

        result = RecommendationEngine().generate(ctx)

        assert result.difficulty in {"Beginner", "Intermediate"}
        assert all(item.durationMinutes <= 20 for item in result.exercises if item.intensity != "Low")

    def test_filters_are_applied_to_each_training_day_in_week_plan(self):
        ctx = _context(
            preferences=_context().preferences.model_copy(
                update={
                    "preferredStrategy": "strength",
                    "workoutDaysPerWeek": 3,
                    "availableEquipment": [],
                    "injuries": ["knee"],
                }
            )
        )

        result = RecommendationEngine().generate_week(ctx)

        training_days = [day for day in result.days if not day.isRestDay and day.recommendation is not None]
        assert training_days
        for day in training_days:
            names = [item.name for item in day.recommendation.exercises]
            assert "Goblet Squat" not in names
