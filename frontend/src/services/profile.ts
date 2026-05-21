import { apiFetch } from "@/lib/api";
import type { UserProfile } from "@/types/health";

export type ProfileUpsertPayload = {
  fullName?: string | null;
  age?: number | null;
  gender?: UserProfile["gender"];
  heightCm?: number | null;
  weightKg?: number | null;
  dietaryPreferences?: string[];
  allergies?: string[];
};

export async function getProfile(): Promise<UserProfile | null> {
  const res = (await apiFetch("/api/v1/profile")) as { data: UserProfile | null };
  return res.data;
}

export async function upsertProfile(payload: ProfileUpsertPayload): Promise<UserProfile> {
  const res = (await apiFetch("/api/v1/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  })) as { data: UserProfile };
  return res.data;
}

