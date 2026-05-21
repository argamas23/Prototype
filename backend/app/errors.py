"""Domain-level exception hierarchy.

Routes raise these instead of FastAPI's `HTTPException` directly. A single
exception handler in `_base.py` maps them to HTTP responses, so domain code
never depends on the transport layer — makes services reusable outside HTTP
(e.g. in a CLI seeding script or a future gRPC facade).
"""

from __future__ import annotations


class DomainError(Exception):
    """Base class for every business-rule violation."""

    status_code: int = 400
    code: str = "domain_error"

    def __init__(self, message: str = "") -> None:
        super().__init__(message or self.code)
        self.message = message or self.code


class NotFoundError(DomainError):
    status_code = 404
    code = "not_found"


class ValidationError(DomainError):
    status_code = 422
    code = "validation_error"


class ConflictError(DomainError):
    status_code = 409
    code = "conflict"


class ExternalServiceError(DomainError):
    """Failure from a dependency we don't own (Firebase, ONNX, …)."""

    status_code = 502
    code = "external_service_error"


class AuthorizationError(DomainError):
    """Caller is authenticated but not allowed to perform this action."""

    status_code = 403
    code = "forbidden"


# ── Meals ────────────────────────────────────────────────────────────────────
class MealNotFound(NotFoundError):
    code = "meal_not_found"


class MealItemsEmpty(ValidationError):
    code = "meal_items_empty"


class ImageRecognitionFailed(ExternalServiceError):
    code = "image_recognition_failed"


class NoFoodDetected(ValidationError):
    code = "no_food_detected"


# ── Workouts ─────────────────────────────────────────────────────────────────
class WorkoutNotFound(NotFoundError):
    code = "workout_not_found"


# ── Goals / Profile ──────────────────────────────────────────────────────────
class GoalConflict(ConflictError):
    code = "goal_conflict"


class ProfileNotFound(NotFoundError):
    code = "profile_not_found"


# ── Plans ────────────────────────────────────────────────────────────────────
class PlanNotFound(NotFoundError):
    code = "plan_not_found"


class PlanForbidden(AuthorizationError):
    code = "plan_forbidden"
