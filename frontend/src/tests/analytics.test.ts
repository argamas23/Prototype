import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  googleProvider: {},
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api";
import { getDailyProgress } from "@/services/analytics";

const mockFetch = apiFetch as ReturnType<typeof vi.fn>;

describe("analytics service", () => {
  beforeEach(() => mockFetch.mockReset());

  it("calls GET /api/v1/analytics/daily with query params", async () => {
    mockFetch.mockResolvedValue({
      data: {
        dateFrom: "2026-04-01",
        dateTo: "2026-04-02",
        points: [],
        summary: {
          days: 2,
          daysWithMeals: 0,
          daysWithWorkouts: 0,
          totals: {
            caloriesConsumed: 0,
            caloriesBurned: 0,
            netCalories: 0,
            workoutMinutes: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            mealCount: 0,
            workoutCount: 0,
            mealItems: 0,
          },
          averagesPerDay: { caloriesConsumed: 0, caloriesBurned: 0, netCalories: 0, workoutMinutes: 0 },
          mealsByType: {},
          workoutsByType: {},
        },
      },
    });

    const result = await getDailyProgress({ dateFrom: "2026-04-01", dateTo: "2026-04-02" });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/analytics/daily?");
    expect(url).toContain("dateFrom=2026-04-01");
    expect(url).toContain("dateTo=2026-04-02");
    expect(result.points).toHaveLength(0);
  });
});
