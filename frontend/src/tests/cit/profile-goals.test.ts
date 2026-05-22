import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  googleProvider: {},
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api";
import { getGoal, setGoal } from "@/services/goals";
import { getProfile, upsertProfile } from "@/services/profile";

const mockFetch = apiFetch as ReturnType<typeof vi.fn>;

describe("CIT smoke (profile + goals services)", () => {
  beforeEach(() => mockFetch.mockReset());

  it("getProfile calls GET /api/v1/profile", async () => {
    mockFetch.mockResolvedValue({ data: { id: "p1", fullName: "Alex" } });
    const result = await getProfile();
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/profile");
    expect(result?.id).toBe("p1");
  });

  it("upsertProfile calls PUT /api/v1/profile", async () => {
    mockFetch.mockResolvedValue({ data: { id: "p1", fullName: "Alex" } });
    const result = await upsertProfile({ fullName: "Alex" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/profile",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(result.id).toBe("p1");
  });

  it("getGoal calls GET /api/v1/goals", async () => {
    mockFetch.mockResolvedValue({ data: { id: "g1", dailyCalories: 2000 } });
    const result = await getGoal();
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/goals");
    expect(result?.id).toBe("g1");
  });

  it("setGoal calls PUT /api/v1/goals", async () => {
    mockFetch.mockResolvedValue({ data: { id: "g1", dailyCalories: 2000 } });
    const result = await setGoal({
      dailyCalories: 2000,
      protein: 0,
      carbs: 0,
      fat: 0,
      targetWeightKg: null,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/goals",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(result.id).toBe("g1");
  });
});

