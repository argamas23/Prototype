"""Nutrition lookup subsystem.

Exposes a single entry point — `resolve_nutrition(name)` — that walks an
ordered chain of `NutritionProvider` strategies and returns the first hit.

Adding a new source (e.g. USDA FoodData Central, an internal DB, a paid API)
means writing one new class that satisfies the `NutritionProvider` protocol
and appending it to `DEFAULT_CHAIN`. Nothing else changes — Open/Closed.
"""

from app.services.nutrition.providers import (
    DEFAULT_CHAIN,
    DefaultEstimateProvider,
    GlobalCommonFoodsProvider,
    IndianNutritionProvider,
    NutritionProvider,
    NutritionResolver,
    resolve_nutrition,
)

__all__ = [
    "DEFAULT_CHAIN",
    "DefaultEstimateProvider",
    "GlobalCommonFoodsProvider",
    "IndianNutritionProvider",
    "NutritionProvider",
    "NutritionResolver",
    "resolve_nutrition",
]
