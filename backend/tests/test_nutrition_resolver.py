"""Tests for the nutrition Strategy chain.

The point of this test file is twofold:
1. Verify the built-in chain still returns sensible values.
2. Prove the Open/Closed Principle — a brand-new `NutritionProvider`
   can be plugged in without modifying any existing code.
"""

from __future__ import annotations

from app.services.nutrition import (
    DefaultEstimateProvider,
    GlobalCommonFoodsProvider,
    IndianNutritionProvider,
    NutritionResolver,
    resolve_nutrition,
)


def test_indian_hit_wins_over_global():
    resolver = NutritionResolver(
        [IndianNutritionProvider(), GlobalCommonFoodsProvider(), DefaultEstimateProvider()]
    )
    nutrition, source = resolver.resolve("dosa")
    assert source == "indian"
    assert nutrition["calories"] == 168


def test_global_hit_when_indian_misses():
    resolver = NutritionResolver(
        [IndianNutritionProvider(), GlobalCommonFoodsProvider(), DefaultEstimateProvider()]
    )
    nutrition, source = resolver.resolve("pizza")
    assert source == "global"
    assert nutrition["calories"] == 266


def test_default_when_nothing_matches():
    resolver = NutritionResolver(
        [IndianNutritionProvider(), GlobalCommonFoodsProvider(), DefaultEstimateProvider()]
    )
    nutrition, source = resolver.resolve("martian-space-broccoli")
    assert source == "default"
    assert nutrition == {"calories": 100.0, "protein": 5.0, "carbs": 15.0, "fat": 3.0}


def test_open_closed_extension_via_new_provider():
    """OCP check: inject a custom provider without editing any existing class."""

    class SushiProvider:
        name = "sushi"

        def lookup(self, food_name: str):
            if "sushi" in food_name.lower():
                return {"calories": 200, "protein": 9.0, "carbs": 38.0, "fat": 0.7}
            return None

    resolver = NutritionResolver(
        [SushiProvider(), IndianNutritionProvider(), DefaultEstimateProvider()]
    )
    nutrition, source = resolver.resolve("salmon sushi")
    assert source == "sushi"
    assert nutrition["calories"] == 200


def test_convenience_entry_point_always_succeeds():
    assert resolve_nutrition("biryani")["calories"] == 190
    assert resolve_nutrition("unknown-food-xyz")["calories"] == 100.0
