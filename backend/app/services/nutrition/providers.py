"""Strategy Pattern for nutrition lookup.

Each provider decides independently whether it can answer a given food name.
The `NutritionResolver` walks providers in priority order and returns the
first non-None result — classic Chain-of-Responsibility on top of Strategy.
"""

from __future__ import annotations

from typing import Protocol


Nutrition = dict[str, float]


class NutritionProvider(Protocol):
    """Contract every nutrition source must satisfy."""

    name: str

    def lookup(self, food_name: str) -> Nutrition | None: ...


def _match_in_table(food_name: str, table: dict[str, Nutrition]) -> Nutrition | None:
    key = food_name.lower().strip().replace("idly", "idli")
    if key in table:
        return table[key]
    for entry, values in table.items():
        if entry in key:
            return values
    return None


class IndianNutritionProvider:
    """Curated Indian foods — highest priority for this app's target audience."""

    name = "indian"

    _TABLE: dict[str, Nutrition] = {
        "idli": {"calories": 58, "protein": 2.0, "carbs": 12.0, "fat": 0.3},
        "dosa": {"calories": 168, "protein": 3.9, "carbs": 28.0, "fat": 4.6},
        "biryani": {"calories": 190, "protein": 5.5, "carbs": 28.0, "fat": 6.5},
        "samosa": {"calories": 308, "protein": 5.5, "carbs": 32.0, "fat": 18.0},
        "upma": {"calories": 120, "protein": 3.0, "carbs": 20.0, "fat": 3.5},
        "poha": {"calories": 130, "protein": 2.5, "carbs": 25.0, "fat": 3.0},
        "chapati": {"calories": 297, "protein": 9.0, "carbs": 57.0, "fat": 3.5},
        "paratha": {"calories": 326, "protein": 7.5, "carbs": 47.0, "fat": 12.0},
        "paneer butter masala": {"calories": 250, "protein": 8.0, "carbs": 10.0, "fat": 20.0},
        "chicken curry": {"calories": 144, "protein": 14.0, "carbs": 6.0, "fat": 7.5},
    }

    def lookup(self, food_name: str) -> Nutrition | None:
        return _match_in_table(food_name, self._TABLE)


class GlobalCommonFoodsProvider:
    """Widely-eaten global foods — covers the long tail the Indian DB misses."""

    name = "global"

    _TABLE: dict[str, Nutrition] = {
        "apple": {"calories": 95, "protein": 0.5, "carbs": 25, "fat": 0.3},
        "banana": {"calories": 105, "protein": 1.3, "carbs": 27, "fat": 0.4},
        "chicken": {"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6},
        "rice": {"calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3},
        "bread": {"calories": 265, "protein": 9, "carbs": 49, "fat": 3.3},
        "egg": {"calories": 155, "protein": 13, "carbs": 1.1, "fat": 11},
        "milk": {"calories": 61, "protein": 3.2, "carbs": 4.8, "fat": 3.3},
        "pizza": {"calories": 266, "protein": 11, "carbs": 36, "fat": 10},
        "pasta": {"calories": 131, "protein": 5, "carbs": 25, "fat": 1.1},
        "salad": {"calories": 50, "protein": 1.5, "carbs": 9, "fat": 0.5},
    }

    def lookup(self, food_name: str) -> Nutrition | None:
        return _match_in_table(food_name, self._TABLE)


class DefaultEstimateProvider:
    """Terminal fallback so the chain always succeeds — never returns None."""

    name = "default"
    _DEFAULT: Nutrition = {"calories": 100.0, "protein": 5.0, "carbs": 15.0, "fat": 3.0}

    def lookup(self, food_name: str) -> Nutrition | None:  # noqa: ARG002
        return dict(self._DEFAULT)


class NutritionResolver:
    """Walks providers in order; short-circuits on the first hit."""

    def __init__(self, providers: list[NutritionProvider]) -> None:
        self._providers = providers

    def resolve(self, food_name: str) -> tuple[Nutrition, str]:
        for provider in self._providers:
            result = provider.lookup(food_name)
            if result is not None:
                return result, provider.name
        # DefaultEstimateProvider guarantees we never reach this branch,
        # but fail safe rather than raise in the hot path of image analysis.
        return {"calories": 100.0, "protein": 5.0, "carbs": 15.0, "fat": 3.0}, "fallback"


DEFAULT_CHAIN: list[NutritionProvider] = [
    IndianNutritionProvider(),
    GlobalCommonFoodsProvider(),
    DefaultEstimateProvider(),
]


_DEFAULT_RESOLVER = NutritionResolver(DEFAULT_CHAIN)


def resolve_nutrition(food_name: str) -> Nutrition:
    """Convenience entry point for call sites that don't need the provider name."""
    result, _ = _DEFAULT_RESOLVER.resolve(food_name)
    return result
