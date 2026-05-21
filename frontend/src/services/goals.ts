import { apiFetch } from "@/lib/api";
import type { Goal } from "@/types/health";

export type GoalPayload = {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  targetWeightKg?: number | null;
};

export async function getGoal(): Promise<Goal | null> {
  const res = (await apiFetch("/api/v1/goals")) as { data: Goal | null };
  return res.data;
}

export async function setGoal(payload: GoalPayload): Promise<Goal> {
  const res = (await apiFetch("/api/v1/goals", {
    method: "PUT",
    body: JSON.stringify(payload),
  })) as { data: Goal };
  return res.data;
}
