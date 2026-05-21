import { apiFetch } from "@/lib/api";
import type { WorkoutPlan, WorkoutPlanExercise, PlanStrategy, ExperienceLevel } from "@/types/health";

export type WorkoutPlanPayload = {
  title: string;
  strategy: PlanStrategy;
  experience: ExperienceLevel[];
  ageMin: number;
  ageMax: number;
  daysPerWeek: number;
  totalMinutes: number;
  equipment: string[];
  workoutTypes: string[];
  constraintsToAvoid: string[];
  summary: string;
  exercises: WorkoutPlanExercise[];
};

export async function listPublicPlans(): Promise<WorkoutPlan[]> {
  const res = (await apiFetch("/api/v1/plans")) as { data: WorkoutPlan[] };
  return res.data;
}

export async function listAdminPlans(): Promise<WorkoutPlan[]> {
  const res = (await apiFetch("/api/v1/plans/admin")) as { data: WorkoutPlan[] };
  return res.data;
}

export async function createAdminPlan(payload: WorkoutPlanPayload): Promise<WorkoutPlan> {
  const res = (await apiFetch("/api/v1/plans/admin", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as { data: WorkoutPlan };
  return res.data;
}

export async function updateAdminPlan(planId: string, payload: WorkoutPlanPayload): Promise<WorkoutPlan> {
  const res = (await apiFetch(`/api/v1/plans/admin/${planId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })) as { data: WorkoutPlan };
  return res.data;
}
