from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Protocol

from app.schemas.recommendations import (
    RecommendedExercise,
    RecommendationStrategyName,
    WorkoutDayPlan,
    WorkoutPreferencesOut,
    WorkoutRecommendationOut,
    WorkoutWeekPlanOut,
)


@dataclass(frozen=True)
class RecommendationContext:
    profile: dict
    goal: dict | None
    preferences: WorkoutPreferencesOut
    activity_history: list[dict]
    today: str

    @property
    def adherence_score(self) -> float:
        if not self.activity_history:
            return 0.5
        completed = sum(1 for item in self.activity_history if item.get("completed", True))
        followed = sum(1 for item in self.activity_history if item.get("followedRecommendation"))
        base = completed / max(1, len(self.activity_history))
        bonus = min(0.2, followed / max(1, len(self.activity_history)) * 0.2)
        return min(1.0, base + bonus)

    @property
    def duration_budget(self) -> int:
        multiplier = 0.9 if self.adherence_score < 0.4 else 1.1 if self.adherence_score > 0.75 else 1.0
        duration = int(round(self.preferences.dailyTimeBudgetMinutes * multiplier))
        return max(10, min(180, duration))

    @property
    def target_difficulty(self) -> str:
        level = self.preferences.experienceLevel
        if level == "Beginner":
            return "Beginner"
        if level == "Advanced" and self.adherence_score >= 0.5:
            return "Advanced"
        return "Intermediate"

    @property
    def has_required_planning_data(self) -> bool:
        required_profile_fields = ("age", "heightCm", "weightKg", "gender")
        has_profile = all(self.profile.get(field) is not None for field in required_profile_fields)
        return has_profile and self.goal is not None

    @property
    def scheduled_days(self) -> int:
        requested = self.preferences.workoutDaysPerWeek
        if self.has_required_planning_data:
            return requested
        return min(3, requested)


@dataclass(frozen=True)
class WorkoutBlueprint:
    focus: str
    title: str
    summary: str
    rationale: list[str]
    exercises: list[RecommendedExercise]
    is_rest_day: bool = False
    rest_notes: list[str] | None = None


@dataclass(frozen=True)
class RecommendationPipelinePayload:
    context: RecommendationContext
    recommendation: WorkoutRecommendationOut


class RecommendationStrategy(Protocol):
    name: RecommendationStrategyName

    def build_plan(self, context: RecommendationContext) -> WorkoutRecommendationOut:
        ...

    def build_week_plan(self, context: RecommendationContext) -> WorkoutWeekPlanOut:
        ...


def _daily_recommendation_from_blueprint(
    context: RecommendationContext,
    strategy: RecommendationStrategyName,
    generated_for: str,
    blueprint: WorkoutBlueprint,
) -> WorkoutRecommendationOut:
    return WorkoutRecommendationOut(
        strategy=strategy,
        title=blueprint.title,
        summary=blueprint.summary,
        rationale=blueprint.rationale,
        estimatedTotalMinutes=sum(item.durationMinutes for item in blueprint.exercises),
        difficulty=context.target_difficulty,
        generatedFor=generated_for,
        exercises=blueprint.exercises,
    )


def _strength_exercises(context: RecommendationContext, focus: str) -> list[RecommendedExercise]:
    duration = context.duration_budget
    block = max(8, duration // 3)
    intensity = "Low" if context.target_difficulty == "Beginner" else "High" if context.target_difficulty == "Advanced" else "Medium"
    templates: dict[str, list[RecommendedExercise]] = {
        "Full Body A": [
            RecommendedExercise(name="Goblet Squat", category="Strength", durationMinutes=block, intensity=intensity, equipment=["dumbbells"], instructions="Drive through the mid-foot and keep your chest tall.", sets=3, reps=12 if context.target_difficulty == "Beginner" else 10, restSeconds=60),
            RecommendedExercise(name="Push-Up", category="Strength", durationMinutes=block, intensity=intensity, equipment=[], instructions="Keep your shoulders stacked and core tight through every rep.", sets=3, reps=10 if context.target_difficulty == "Beginner" else 15, restSeconds=45),
            RecommendedExercise(name="Bent-Over Row", category="Strength", durationMinutes=duration - (block * 2), intensity=intensity, equipment=["dumbbells"], instructions="Lead with your elbows and pause at the top.", sets=3, reps=12, restSeconds=60),
        ],
        "Full Body B": [
            RecommendedExercise(name="Romanian Deadlift", category="Strength", durationMinutes=block, intensity=intensity, equipment=["dumbbells"], instructions="Hinge from the hips and keep the weights close to the body.", sets=3, reps=10, restSeconds=60),
            RecommendedExercise(name="Split Squat", category="Strength", durationMinutes=block, intensity=intensity, equipment=[], instructions="Stay upright and control the lowering phase.", sets=3, reps=10, restSeconds=45),
            RecommendedExercise(name="Overhead Press", category="Strength", durationMinutes=duration - (block * 2), intensity=intensity, equipment=["dumbbells"], instructions="Press overhead without arching through the lower back.", sets=3, reps=10, restSeconds=60),
        ],
        "Upper Body": [
            RecommendedExercise(name="Push-Up", category="Strength", durationMinutes=block, intensity=intensity, equipment=[], instructions="Press evenly and keep a straight line from head to heel.", sets=3, reps=12, restSeconds=45),
            RecommendedExercise(name="One-Arm Row", category="Strength", durationMinutes=block, intensity=intensity, equipment=["dumbbells"], instructions="Pull toward the hip and avoid twisting.", sets=3, reps=10, restSeconds=60),
            RecommendedExercise(name="Shoulder Press", category="Strength", durationMinutes=duration - (block * 2), intensity=intensity, equipment=["dumbbells"], instructions="Finish with biceps by the ears.", sets=3, reps=10, restSeconds=60),
        ],
        "Lower Body": [
            RecommendedExercise(name="Goblet Squat", category="Strength", durationMinutes=block, intensity=intensity, equipment=["dumbbells"], instructions="Keep hips and knees moving together.", sets=3, reps=12, restSeconds=60),
            RecommendedExercise(name="Romanian Deadlift", category="Strength", durationMinutes=block, intensity=intensity, equipment=["dumbbells"], instructions="Keep a soft knee bend and hinge with control.", sets=3, reps=10, restSeconds=60),
            RecommendedExercise(name="Reverse Lunge", category="Strength", durationMinutes=duration - (block * 2), intensity=intensity, equipment=[], instructions="Step back softly and drive up through the front leg.", sets=3, reps=10, restSeconds=45),
        ],
    }
    return templates.get(focus, templates["Full Body A"])


def _cardio_exercises(context: RecommendationContext, focus: str) -> list[RecommendedExercise]:
    duration = context.duration_budget
    low_impact_equipment = ["bicycle"] if not context.preferences.preferLowImpact else []
    base_modality = "Bike" if "bicycle" in {item.lower() for item in context.preferences.availableEquipment} else "Walk"
    if focus == "Intervals":
        return [
            RecommendedExercise(name="Warm-Up Walk", category="Cardio", durationMinutes=max(5, duration // 5), intensity="Low", equipment=[], instructions="Ease into the session and gradually raise your heart rate."),
            RecommendedExercise(
                name=f"{base_modality} Intervals",
                category="Cardio",
                durationMinutes=max(10, duration - max(5, duration // 5) - 5),
                intensity="Low" if context.preferences.preferLowImpact else "Medium",
                equipment=low_impact_equipment,
                instructions="Alternate one minute of strong effort with two minutes at recovery pace.",
            ),
            RecommendedExercise(name="Cooldown Walk", category="Cardio", durationMinutes=5, intensity="Low", equipment=[], instructions="Return to a conversational pace and focus on relaxed breathing."),
        ]
    if focus == "Long Endurance":
        return [
            RecommendedExercise(name="Warm-Up Mobility", category="Recovery", durationMinutes=5, intensity="Low", equipment=[], instructions="Loosen ankles, hips, and shoulders before the main set."),
            RecommendedExercise(
                name=f"{base_modality} Endurance",
                category="Cardio",
                durationMinutes=max(15, duration - 10),
                intensity="Low" if context.target_difficulty == "Beginner" else "Medium",
                equipment=low_impact_equipment,
                instructions="Stay at a pace you can maintain steadily for the full block.",
            ),
            RecommendedExercise(name="Cooldown Stretch", category="Recovery", durationMinutes=5, intensity="Low", equipment=[], instructions="Stretch calves, hips, and hamstrings."),
        ]
    return [
        RecommendedExercise(name="Brisk Walk Warm-Up", category="Cardio", durationMinutes=max(5, duration // 5), intensity="Low", equipment=[], instructions="Start easy and build rhythm."),
        RecommendedExercise(name="Tempo Cardio", category="Cardio", durationMinutes=max(10, duration - 10), intensity="Medium", equipment=low_impact_equipment, instructions="Hold a comfortably hard pace without sprinting."),
        RecommendedExercise(name="Cooldown Walk", category="Cardio", durationMinutes=5, intensity="Low", equipment=[], instructions="Bring breathing under control and finish easy."),
    ]


def _weight_loss_exercises(context: RecommendationContext, focus: str) -> list[RecommendedExercise]:
    duration = context.duration_budget
    strength_block = max(10, duration // 2)
    cardio_block = duration - strength_block
    templates: dict[str, list[RecommendedExercise]] = {
        "Metabolic Strength": [
            RecommendedExercise(name="Bodyweight Squat", category="Strength", durationMinutes=max(8, strength_block // 2), intensity="Medium", equipment=[], instructions="Control the descent and stand up with purpose.", sets=3, reps=15, restSeconds=30),
            RecommendedExercise(name="Step-Up", category="Conditioning", durationMinutes=max(8, strength_block - max(8, strength_block // 2)), intensity="Medium", equipment=["bench"], instructions="Drive through the front foot and stay stable.", sets=3, reps=12, restSeconds=30),
            RecommendedExercise(name="Incline Walk", category="Cardio", durationMinutes=max(10, cardio_block), intensity="Medium", equipment=["treadmill"], instructions="Keep posture tall and pace steady."),
        ],
        "Intervals": [
            RecommendedExercise(name="Dynamic Warm-Up", category="Recovery", durationMinutes=5, intensity="Low", equipment=[], instructions="Prime hips, ankles, and shoulders."),
            RecommendedExercise(name="Fast Walk Intervals", category="Cardio", durationMinutes=max(12, duration - 10), intensity="Medium", equipment=[], instructions="Alternate brisk efforts with easy recovery."),
            RecommendedExercise(name="Core Finisher", category="Conditioning", durationMinutes=5, intensity="Medium", equipment=[], instructions="Finish with controlled planks or dead-bugs.", sets=3, reps=10, restSeconds=20),
        ],
        "Circuit": [
            RecommendedExercise(name="Squat to Press", category="Conditioning", durationMinutes=max(8, duration // 3), intensity="Medium", equipment=["dumbbells"], instructions="Link lower- and upper-body work smoothly.", sets=3, reps=12, restSeconds=30),
            RecommendedExercise(name="Alternating Reverse Lunge", category="Conditioning", durationMinutes=max(8, duration // 3), intensity="Medium", equipment=[], instructions="Stay tall and move with rhythm.", sets=3, reps=10, restSeconds=30),
            RecommendedExercise(name="Zone 2 Cardio", category="Cardio", durationMinutes=max(10, duration - (2 * max(8, duration // 3))), intensity="Low", equipment=[], instructions="Finish with sustained easy cardio to build volume."),
        ],
    }
    return templates.get(focus, templates["Metabolic Strength"])


def _strength_blueprint(context: RecommendationContext, focus: str) -> WorkoutBlueprint:
    return WorkoutBlueprint(
        focus=focus,
        title=f"{focus} Strength Session",
        summary="A progressive strength workout built around compound patterns and repeatable weekly structure.",
        rationale=[
            "Strength work is split across the week to improve recovery and progression.",
            "Session volume is scaled to your available time and recent adherence.",
        ],
        exercises=_strength_exercises(context, focus),
    )


def _cardio_blueprint(context: RecommendationContext, focus: str) -> WorkoutBlueprint:
    return WorkoutBlueprint(
        focus=focus,
        title=f"{focus} Cardio Session",
        summary="An endurance-focused cardio workout designed to improve aerobic capacity without excessive fatigue.",
        rationale=[
            "Weekly variety alternates intensity and longer aerobic work.",
            "Low-impact handling is applied when your preferences call for it.",
        ],
        exercises=_cardio_exercises(context, focus),
    )


def _weight_loss_blueprint(context: RecommendationContext, focus: str) -> WorkoutBlueprint:
    return WorkoutBlueprint(
        focus=focus,
        title=f"{focus} Fat-Loss Session",
        summary="A mixed conditioning workout that balances calorie expenditure, muscle retention, and recovery.",
        rationale=[
            "Weekly training blends resistance work with cardio so the plan stays sustainable.",
            "Exercise density is matched to your available time and adherence trends.",
        ],
        exercises=_weight_loss_exercises(context, focus),
    )


def _rest_blueprint(focus: str) -> WorkoutBlueprint:
    return WorkoutBlueprint(
        focus=focus,
        title=f"{focus} Recovery",
        summary="A scheduled recovery block to support consistency through the rest of the week.",
        rationale=["Recovery is planned intentionally so harder sessions stay productive."],
        exercises=[],
        is_rest_day=True,
        rest_notes=[
            "Take a walk, hydrate well, and prioritize sleep.",
            "Light stretching or mobility is optional if you feel stiff.",
        ],
    )


def _program_focuses(strategy: RecommendationStrategyName, scheduled_days: int) -> list[str]:
    templates: dict[RecommendationStrategyName, dict[int, list[str]]] = {
        "strength": {
            1: ["Full Body A", "Recovery", "Recovery", "Recovery", "Recovery", "Recovery", "Recovery"],
            2: ["Full Body A", "Recovery", "Full Body B", "Recovery", "Recovery", "Recovery", "Recovery"],
            3: ["Full Body A", "Recovery", "Full Body B", "Recovery", "Full Body A", "Recovery", "Recovery"],
            4: ["Upper Body", "Lower Body", "Recovery", "Full Body A", "Recovery", "Upper Body", "Recovery"],
            5: ["Upper Body", "Lower Body", "Recovery", "Upper Body", "Lower Body", "Full Body A", "Recovery"],
            6: ["Upper Body", "Lower Body", "Recovery", "Full Body A", "Upper Body", "Lower Body", "Full Body B"],
            7: ["Upper Body", "Lower Body", "Full Body A", "Upper Body", "Lower Body", "Full Body B", "Full Body A"],
        },
        "cardio_endurance": {
            1: ["Long Endurance", "Recovery", "Recovery", "Recovery", "Recovery", "Recovery", "Recovery"],
            2: ["Intervals", "Recovery", "Long Endurance", "Recovery", "Recovery", "Recovery", "Recovery"],
            3: ["Intervals", "Recovery", "Tempo", "Recovery", "Long Endurance", "Recovery", "Recovery"],
            4: ["Intervals", "Tempo", "Recovery", "Long Endurance", "Recovery", "Tempo", "Recovery"],
            5: ["Intervals", "Tempo", "Recovery", "Long Endurance", "Tempo", "Intervals", "Recovery"],
            6: ["Intervals", "Tempo", "Recovery", "Long Endurance", "Tempo", "Intervals", "Long Endurance"],
            7: ["Intervals", "Tempo", "Long Endurance", "Tempo", "Intervals", "Long Endurance", "Tempo"],
        },
        "weight_loss": {
            1: ["Metabolic Strength", "Recovery", "Recovery", "Recovery", "Recovery", "Recovery", "Recovery"],
            2: ["Metabolic Strength", "Recovery", "Intervals", "Recovery", "Recovery", "Recovery", "Recovery"],
            3: ["Metabolic Strength", "Recovery", "Intervals", "Recovery", "Circuit", "Recovery", "Recovery"],
            4: ["Metabolic Strength", "Intervals", "Recovery", "Circuit", "Recovery", "Metabolic Strength", "Recovery"],
            5: ["Metabolic Strength", "Intervals", "Recovery", "Circuit", "Metabolic Strength", "Intervals", "Recovery"],
            6: ["Metabolic Strength", "Intervals", "Recovery", "Circuit", "Metabolic Strength", "Intervals", "Circuit"],
            7: ["Metabolic Strength", "Intervals", "Circuit", "Metabolic Strength", "Intervals", "Circuit", "Metabolic Strength"],
        },
    }
    safe_days = max(1, min(7, scheduled_days))
    return templates[strategy][safe_days]


def _coerce_strategy_recommendation(
    strategy_name: RecommendationStrategyName,
    recommendation: WorkoutRecommendationOut,
) -> WorkoutRecommendationOut:
    if recommendation.strategy == strategy_name:
        return recommendation
    return recommendation.model_copy(update={"strategy": strategy_name})


class StrengthTrainingStrategy:
    name: RecommendationStrategyName = "strength"

    def build_plan(self, context: RecommendationContext) -> WorkoutRecommendationOut:
        return _daily_recommendation_from_blueprint(
            context,
            self.name,
            context.today,
            _strength_blueprint(context, "Full Body A"),
        )

    def build_week_plan(self, context: RecommendationContext) -> WorkoutWeekPlanOut:
        return _build_week_plan(context, self.name, _strength_blueprint)


class CardioEnduranceStrategy:
    name: RecommendationStrategyName = "cardio_endurance"

    def build_plan(self, context: RecommendationContext) -> WorkoutRecommendationOut:
        return _daily_recommendation_from_blueprint(
            context,
            self.name,
            context.today,
            _cardio_blueprint(context, "Intervals"),
        )

    def build_week_plan(self, context: RecommendationContext) -> WorkoutWeekPlanOut:
        return _build_week_plan(context, self.name, _cardio_blueprint)


class WeightLossStrategy:
    name: RecommendationStrategyName = "weight_loss"

    def build_plan(self, context: RecommendationContext) -> WorkoutRecommendationOut:
        return _daily_recommendation_from_blueprint(
            context,
            self.name,
            context.today,
            _weight_loss_blueprint(context, "Metabolic Strength"),
        )

    def build_week_plan(self, context: RecommendationContext) -> WorkoutWeekPlanOut:
        return _build_week_plan(context, self.name, _weight_loss_blueprint)


class RecommendationFilter:
    def __init__(self) -> None:
        self._next: RecommendationFilter | None = None

    def set_next(self, next_filter: RecommendationFilter) -> RecommendationFilter:
        self._next = next_filter
        return next_filter

    def process(self, payload: RecommendationPipelinePayload) -> RecommendationPipelinePayload:
        filtered = self._process(payload)
        if self._next is not None:
            return self._next.process(filtered)
        return filtered

    def apply(self, recommendation: WorkoutRecommendationOut, context: RecommendationContext) -> WorkoutRecommendationOut:
        payload = RecommendationPipelinePayload(context=context, recommendation=recommendation)
        return self.process(payload).recommendation

    def _process(self, payload: RecommendationPipelinePayload) -> RecommendationPipelinePayload:
        return payload

    def _with_exercises(
        self,
        payload: RecommendationPipelinePayload,
        exercises: list[RecommendedExercise],
    ) -> RecommendationPipelinePayload:
        recommendation = payload.recommendation
        fallback = exercises or [
            RecommendedExercise(
                name="Mobility Flow",
                category="Recovery",
                durationMinutes=max(10, recommendation.estimatedTotalMinutes),
                intensity="Low",
                equipment=[],
                instructions="Move gently through hips, shoulders, and ankles.",
            )
        ]
        updated = recommendation.model_copy(
            update={"exercises": fallback, "estimatedTotalMinutes": sum(item.durationMinutes for item in fallback)}
        )
        return RecommendationPipelinePayload(context=payload.context, recommendation=updated)


class SafetyFilter(RecommendationFilter):
    def _process(self, payload: RecommendationPipelinePayload) -> RecommendationPipelinePayload:
        recommendation = payload.recommendation
        context = payload.context
        injuries = {item.strip().lower() for item in context.preferences.injuries}
        avoid = {item.strip().lower() for item in context.preferences.avoidExercises}
        low_impact = context.preferences.preferLowImpact
        filtered: list[RecommendedExercise] = []
        for exercise in recommendation.exercises:
            name = exercise.name.lower()
            if name in avoid:
                continue
            if "knee" in injuries and ("squat" in name or "step-up" in name or "lunge" in name):
                continue
            if "shoulder" in injuries and ("push-up" in name or "row" in name or "press" in name):
                continue
            if low_impact and ("jump" in name or "burpee" in name or "sprint" in name):
                continue
            filtered.append(exercise)
        return self._with_exercises(payload, filtered)


class EquipmentAvailabilityFilter(RecommendationFilter):
    def _process(self, payload: RecommendationPipelinePayload) -> RecommendationPipelinePayload:
        recommendation = payload.recommendation
        context = payload.context
        available = {item.strip().lower() for item in context.preferences.availableEquipment}
        filtered = [
            exercise
            for exercise in recommendation.exercises
            if all(item.strip().lower() in available for item in exercise.equipment)
            or len(exercise.equipment) == 0
        ]
        return self._with_exercises(payload, filtered)


class ExperienceLevelFilter(RecommendationFilter):
    def _process(self, payload: RecommendationPipelinePayload) -> RecommendationPipelinePayload:
        recommendation = payload.recommendation
        context = payload.context
        level = context.preferences.experienceLevel
        capped: list[RecommendedExercise] = []
        for exercise in recommendation.exercises:
            updated = exercise
            if level == "Beginner" and exercise.intensity == "High":
                updated = updated.model_copy(update={"intensity": "Medium", "sets": min(exercise.sets or 2, 3)})
            if level == "Beginner" and exercise.durationMinutes > 20:
                updated = updated.model_copy(update={"durationMinutes": 20})
            capped.append(updated)
        difficulty = "Intermediate" if level == "Beginner" and recommendation.difficulty == "Advanced" else recommendation.difficulty
        updated_payload = RecommendationPipelinePayload(
            context=context,
            recommendation=recommendation.model_copy(update={"difficulty": difficulty}),
        )
        return self._with_exercises(updated_payload, capped)


class RecommendationPipeline:
    def __init__(self, filters: list[RecommendationFilter]) -> None:
        self._filters = filters

    def run(self, payload: RecommendationPipelinePayload) -> RecommendationPipelinePayload:
        current = payload
        for filter_ in self._filters:
            current = filter_.process(current)
        return current

    def apply(self, recommendation: WorkoutRecommendationOut, context: RecommendationContext) -> WorkoutRecommendationOut:
        payload = RecommendationPipelinePayload(context=context, recommendation=recommendation)
        return self.run(payload).recommendation


def _build_week_plan(
    context: RecommendationContext,
    strategy_name: RecommendationStrategyName,
    builder,
) -> WorkoutWeekPlanOut:
    start_date = date.fromisoformat(context.today)
    focuses = _program_focuses(strategy_name, context.scheduled_days)
    days: list[WorkoutDayPlan] = []
    for offset in range(7):
        day_date = start_date + timedelta(days=offset)
        focus = focuses[offset] if offset < len(focuses) else "Recovery"
        if focus == "Recovery":
            blueprint = _rest_blueprint(focus)
            days.append(
                WorkoutDayPlan(
                    date=day_date.isoformat(),
                    label=day_date.strftime("%A"),
                    focus=focus,
                    isRestDay=True,
                    rationale=blueprint.rest_notes or [],
                    recommendation=None,
                )
            )
            continue

        blueprint = builder(context, focus)
        recommendation = _daily_recommendation_from_blueprint(context, strategy_name, day_date.isoformat(), blueprint)
        days.append(
            WorkoutDayPlan(
                date=day_date.isoformat(),
                label=day_date.strftime("%A"),
                focus=focus,
                isRestDay=False,
                rationale=blueprint.rationale,
                recommendation=recommendation,
            )
        )

    scheduled = sum(0 if item.isRestDay else 1 for item in days)
    return WorkoutWeekPlanOut(
        strategy=strategy_name,
        generatedForWeekOf=context.today,
        difficulty=context.target_difficulty,
        weeklySummary="A rule-based seven-day program that balances workload, recovery, and your current training goal.",
        weeklyRationale=[
            "Training days are distributed across the week to avoid stacking fatigue unnecessarily.",
            "If profile or goal data is incomplete, the program stays conservative instead of over-prescribing volume.",
        ],
        scheduledDays=scheduled,
        recoveryDays=7 - scheduled,
        days=days,
    )


class RecommendationEngine:
    def __init__(
        self,
        strategies: dict[RecommendationStrategyName, RecommendationStrategy] | None = None,
        filter_chain: RecommendationFilter | None = None,
        pipeline: RecommendationPipeline | None = None,
    ) -> None:
        self._strategies = strategies or {
            "strength": StrengthTrainingStrategy(),
            "cardio_endurance": CardioEnduranceStrategy(),
            "weight_loss": WeightLossStrategy(),
        }
        self._pipeline = pipeline or self._build_pipeline(filter_chain)

    def _build_pipeline(self, filter_chain: RecommendationFilter | None) -> RecommendationPipeline:
        if filter_chain is None:
            return RecommendationPipeline(
                [SafetyFilter(), EquipmentAvailabilityFilter(), ExperienceLevelFilter()]
            )
        return RecommendationPipeline(self._flatten_filter_chain(filter_chain))

    def _flatten_filter_chain(self, filter_chain: RecommendationFilter) -> list[RecommendationFilter]:
        filters: list[RecommendationFilter] = []
        current: RecommendationFilter | None = filter_chain
        while current is not None:
            filters.append(current)
            current = current._next
        return filters

    def generate(self, context: RecommendationContext) -> WorkoutRecommendationOut:
        strategy_name = self.resolve_strategy(context)
        recommendation = self._strategies[strategy_name].build_plan(context)
        recommendation = _coerce_strategy_recommendation(strategy_name, recommendation)
        return self._pipeline.apply(recommendation, context)

    def generate_week(self, context: RecommendationContext) -> WorkoutWeekPlanOut:
        strategy_name = self.resolve_strategy(context)
        week_plan = self._strategies[strategy_name].build_week_plan(context)
        filtered_days: list[WorkoutDayPlan] = []
        for day in week_plan.days:
            if day.isRestDay or day.recommendation is None:
                filtered_days.append(day)
                continue
            filtered_days.append(
                day.model_copy(
                    update={
                        "recommendation": self._pipeline.apply(
                            _coerce_strategy_recommendation(strategy_name, day.recommendation),
                            context,
                        )
                    }
                )
            )
        return week_plan.model_copy(update={"days": filtered_days})

    def resolve_strategy(self, context: RecommendationContext) -> RecommendationStrategyName:
        preferred = context.preferences.preferredStrategy
        if preferred is not None:
            return preferred

        goal = context.goal or {}
        target_weight = goal.get("targetWeightKg")
        weight = context.profile.get("weightKg")
        if isinstance(target_weight, (int, float)) and isinstance(weight, (int, float)) and target_weight < weight:
            return "weight_loss"

        preference_types = {item.strip().lower() for item in context.preferences.preferredWorkoutTypes}
        if {"running", "cycling", "swimming", "cardio"} & preference_types:
            return "cardio_endurance"
        return "strength"
