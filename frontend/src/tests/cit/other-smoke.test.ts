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
import { getDashboard } from "@/services/dashboard";
import { createAdminPlan, listAdminPlans, listPublicPlans, updateAdminPlan } from "@/services/plans";

const mockFetch = apiFetch as ReturnType<typeof vi.fn>;

describe("CIT smoke (dashboard + analytics + plans services)", () => {
  beforeEach(() => mockFetch.mockReset());

  it("getDashboard without date calls GET /api/v1/dashboard", async () => {
    mockFetch.mockResolvedValue({ data: { date: "2026-01-01" } });
    const result = await getDashboard();
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/dashboard");
    expect((result as any).date).toBe("2026-01-01");
  });

  it("getDashboard with date calls GET /api/v1/dashboard?date=...", async () => {
    mockFetch.mockResolvedValue({ data: { date: "2026-01-02" } });
    const result = await getDashboard("2026-01-02");
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/dashboard?date=2026-01-02");
    expect((result as any).date).toBe("2026-01-02");
  });

  it("listPublicPlans calls GET /api/v1/plans", async () => {
    mockFetch.mockResolvedValue({ data: [{ id: "plan-1", title: "Beginner" }] });
    const result = await listPublicPlans();
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/plans");
    expect(result).toHaveLength(1);
  });

  it("listAdminPlans calls GET /api/v1/plans/admin", async () => {
    mockFetch.mockResolvedValue({ data: [{ id: "plan-1", title: "Beginner" }] });
    const result = await listAdminPlans();
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/plans/admin");
    expect(result).toHaveLength(1);
  });

  it("createAdminPlan calls POST /api/v1/plans/admin", async () => {
    mockFetch.mockResolvedValue({ data: { id: "plan-1", title: "Beginner" } });
    const result = await createAdminPlan({
      title: "Beginner",
      strategy: "FatLoss",
      experience: ["Beginner"],
      ageMin: 18,
      ageMax: 65,
      daysPerWeek: 3,
      totalMinutes: 90,
      equipment: [],
      workoutTypes: [],
      constraintsToAvoid: [],
      summary: "Test plan",
      exercises: [],
    } as any);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/plans/admin",
      expect.objectContaining({ method: "POST" }),
    );
    expect((result as any).id).toBe("plan-1");
  });

  it("updateAdminPlan calls PUT /api/v1/plans/admin/:id", async () => {
    mockFetch.mockResolvedValue({ data: { id: "plan-1", title: "Beginner" } });
    const result = await updateAdminPlan("plan-1", {
      title: "Beginner",
      strategy: "FatLoss",
      experience: ["Beginner"],
      ageMin: 18,
      ageMax: 65,
      daysPerWeek: 3,
      totalMinutes: 90,
      equipment: [],
      workoutTypes: [],
      constraintsToAvoid: [],
      summary: "Test plan",
      exercises: [],
    } as any);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/plans/admin/plan-1",
      expect.objectContaining({ method: "PUT" }),
    );
    expect((result as any).id).toBe("plan-1");
  });

  it("getDailyProgress calls GET /api/v1/analytics/daily with query params", async () => {
    mockFetch.mockResolvedValue({ data: { points: [], summary: { days: 2 } } });
    const result = await getDailyProgress({ dateFrom: "2026-04-01", dateTo: "2026-04-02" });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/analytics/daily?");
    expect(url).toContain("dateFrom=2026-04-01");
    expect(url).toContain("dateTo=2026-04-02");
    expect(result.points).toHaveLength(0);
  });
});

