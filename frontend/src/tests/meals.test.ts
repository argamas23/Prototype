import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock firebase so we don't need real credentials in tests
vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  googleProvider: {},
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api";
import { logMeal, listMeals, deleteMeal } from "@/services/meals";

const mockFetch = apiFetch as ReturnType<typeof vi.fn>;

const MEAL_FIXTURE = {
  id: "meal-1",
  mealType: "Lunch" as const,
  date: "2026-04-11",
  time: "12:00",
  totals: { calories: 500, protein: 30, carbs: 60, fat: 15 },
  items: [{ id: "i1", name: "Rice", quantity: 200, unit: "g", calories: 260, protein: 5, carbs: 55, fat: 1 }],
};

describe("meals service", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("logMeal", () => {
    it("calls POST /api/v1/meals and returns meal data", async () => {
      mockFetch.mockResolvedValue({ data: MEAL_FIXTURE });

      const result = await logMeal({
        mealType: "Lunch",
        date: "2026-04-11",
        time: "12:00",
        items: [{ name: "Rice", quantity: 200, unit: "g", calories: 260, protein: 5, carbs: 55, fat: 1 }],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/meals",
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.id).toBe("meal-1");
      expect(result.mealType).toBe("Lunch");
    });
  });

  describe("listMeals", () => {
    it("calls GET /api/v1/meals and returns items", async () => {
      mockFetch.mockResolvedValue({ items: [MEAL_FIXTURE], total: 1 });

      const result = await listMeals({ page: 1, pageSize: 25 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/meals"),
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("appends date filters to the query string", async () => {
      mockFetch.mockResolvedValue({ items: [], total: 0 });

      await listMeals({ dateFrom: "2026-04-01", dateTo: "2026-04-11" });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("dateFrom=2026-04-01");
      expect(url).toContain("dateTo=2026-04-11");
    });
  });

  describe("deleteMeal", () => {
    it("calls DELETE /api/v1/meals/:id", async () => {
      mockFetch.mockResolvedValue(null);

      await deleteMeal("meal-1");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/meals/meal-1",
        { method: "DELETE" },
      );
    });
  });
});
