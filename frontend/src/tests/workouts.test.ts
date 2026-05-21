import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  googleProvider: {},
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api";
import {
  deleteWorkout,
  getTodayRecommendation,
  getWeeklyRecommendation,
  getWorkoutPreferences,
  listWorkouts,
  logWorkout,
  updateWorkoutPreferences,
} from "@/services/workouts";

const mockFetch = apiFetch as ReturnType<typeof vi.fn>;

const WORKOUT_FIXTURE = {
  id: "wo-1",
  workoutType: "Running" as const,
  date: "2026-04-11",
  exercises: [
    {
      workoutType: "Running" as const,
      name: "Easy run",
      durationMinutes: 30,
      caloriesBurned: 300,
      distance: 5,
      distanceUnit: "km" as const,
      notes: "Morning run",
    },
  ],
  durationMinutes: 30,
  intensity: "Medium" as const,
  caloriesBurned: 300,
};

describe("workouts service", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("logWorkout", () => {
    it("calls POST /api/v1/workouts and returns workout data", async () => {
      mockFetch.mockResolvedValue({ data: WORKOUT_FIXTURE });

      const result = await logWorkout({
        workoutType: "Running",
        date: "2026-04-11",
        exercises: [
          {
            workoutType: "Running",
            name: "Easy run",
            durationMinutes: 30,
            caloriesBurned: 300,
            distance: 5,
            distanceUnit: "km",
            notes: "Morning run",
          },
        ],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/workouts",
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.id).toBe("wo-1");
      expect(result.workoutType).toBe("Running");
    });

    it("allows zero caloriesBurned", async () => {
      mockFetch.mockResolvedValue({ data: { ...WORKOUT_FIXTURE, caloriesBurned: 0 } });

      const result = await logWorkout({
        workoutType: "Yoga",
        date: "2026-04-11",
        exercises: [
          {
            workoutType: "Yoga",
            name: "Vinyasa flow",
            durationMinutes: 45,
            caloriesBurned: 0,
          },
        ],
      });

      expect(result.caloriesBurned).toBe(0);
    });
  });

  describe("listWorkouts", () => {
    it("calls GET /api/v1/workouts and returns items", async () => {
      mockFetch.mockResolvedValue({ items: [WORKOUT_FIXTURE], total: 1 });

      const result = await listWorkouts({ page: 1 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/workouts"),
      );
      expect(result.items).toHaveLength(1);
    });

    it("appends date filters to query string", async () => {
      mockFetch.mockResolvedValue({ items: [], total: 0 });

      await listWorkouts({ dateFrom: "2026-04-01", dateTo: "2026-04-11" });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("dateFrom=2026-04-01");
      expect(url).toContain("dateTo=2026-04-11");
    });
  });

  describe("deleteWorkout", () => {
    it("calls DELETE /api/v1/workouts/:id", async () => {
      mockFetch.mockResolvedValue(null);

      await deleteWorkout("wo-1");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/workouts/wo-1",
        { method: "DELETE" },
      );
    });
  });

  describe("recommendations", () => {
    it("calls GET /api/v1/workouts/recommendations/today", async () => {
      mockFetch.mockResolvedValue({
        data: {
          strategy: "strength",
          title: "Full-Body Strength Builder",
          summary: "A balanced session.",
          rationale: ["Because it fits today."],
          estimatedTotalMinutes: 30,
          difficulty: "Beginner",
          generatedFor: "2026-04-24",
          exercises: [],
        },
      });

      const result = await getTodayRecommendation();

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/workouts/recommendations/today");
      expect(result.strategy).toBe("strength");
    });

    it("calls GET /api/v1/workouts/preferences", async () => {
      mockFetch.mockResolvedValue({
        data: {
          id: "workout",
          experienceLevel: "Beginner",
          availableEquipment: [],
          injuries: [],
          avoidExercises: [],
          preferredWorkoutTypes: [],
          dailyTimeBudgetMinutes: 30,
          workoutDaysPerWeek: 3,
          preferLowImpact: false,
        },
      });

      const result = await getWorkoutPreferences();

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/workouts/preferences");
      expect(result.id).toBe("workout");
    });

    it("calls GET /api/v1/workouts/recommendations/week", async () => {
      mockFetch.mockResolvedValue({
        data: {
          strategy: "strength",
          generatedForWeekOf: "2026-04-24",
          difficulty: "Beginner",
          weeklySummary: "Seven-day plan",
          weeklyRationale: [],
          scheduledDays: 3,
          recoveryDays: 4,
          days: [],
        },
      });

      const result = await getWeeklyRecommendation();

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/workouts/recommendations/week");
      expect(result.scheduledDays).toBe(3);
    });

    it("calls PUT /api/v1/workouts/preferences and returns bundle", async () => {
      mockFetch.mockResolvedValue({
        data: {
          preferences: {
            id: "workout",
            preferredStrategy: "weight_loss",
            experienceLevel: "Intermediate",
            availableEquipment: ["treadmill"],
            injuries: [],
            avoidExercises: [],
            preferredWorkoutTypes: ["running"],
            dailyTimeBudgetMinutes: 40,
            workoutDaysPerWeek: 4,
            preferLowImpact: false,
          },
          recommendation: {
            strategy: "weight_loss",
            title: "Calorie-Burn Circuit",
            summary: "Mixed routine",
            rationale: [],
            estimatedTotalMinutes: 40,
            difficulty: "Intermediate",
            generatedFor: "2026-04-24",
            exercises: [],
          },
        },
      });

      const result = await updateWorkoutPreferences({
        preferredStrategy: "weight_loss",
        dailyTimeBudgetMinutes: 40,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/workouts/preferences",
        expect.objectContaining({ method: "PUT" }),
      );
      expect(result.recommendation.strategy).toBe("weight_loss");
    });
  });
});
