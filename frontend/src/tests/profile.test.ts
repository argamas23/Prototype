import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  googleProvider: {},
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api";
import { getProfile, upsertProfile } from "@/services/profile";

const mockFetch = apiFetch as ReturnType<typeof vi.fn>;

describe("profile service", () => {
  beforeEach(() => mockFetch.mockReset());

  it("calls GET /api/v1/profile", async () => {
    mockFetch.mockResolvedValue({ data: { id: "main", fullName: "Alex" } });
    const profile = await getProfile();
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/profile");
    expect(profile?.id).toBe("main");
  });

  it("calls PUT /api/v1/profile", async () => {
    mockFetch.mockResolvedValue({ data: { id: "main", fullName: "Alex" } });
    const updated = await upsertProfile({ fullName: "Alex" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/profile",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(updated.fullName).toBe("Alex");
  });
});

