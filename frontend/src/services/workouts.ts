import { apiFetch } from "@/lib/api";
import type {
  ExperienceLevel,
  Intensity,
  RecommendationStrategyName,
  Workout,
  WorkoutPreferences,
  WorkoutRecommendation,
  WorkoutRecommendationBundle,
  WorkoutWeekPlan,
  WorkoutType,
} from "@/types/health";

export type LogWorkoutPayload = {
  workoutType?: WorkoutType;
  date: string;
  exercises: {
    workoutType: WorkoutType;
    name: string;
    durationMinutes?: number;
    caloriesBurned: number;
    notes?: string | null;
    distance?: number;
    distanceUnit?: "km" | "mi";
    sets?: number;
    repsPerSet?: number;
    weight?: number;
    weightUnit?: "kg" | "lb";
  }[];
  recommendationContext?: {
    strategy: RecommendationStrategyName;
    difficulty?: ExperienceLevel | null;
    generatedFor?: string | null;
    title?: string | null;
    followedAsRecommended?: boolean;
  } | null;
};

export type UpdateWorkoutPreferencesPayload = {
  preferredStrategy?: RecommendationStrategyName | null;
  experienceLevel?: ExperienceLevel;
  availableEquipment?: string[];
  injuries?: string[];
  avoidExercises?: string[];
  preferredWorkoutTypes?: string[];
  dailyTimeBudgetMinutes?: number;
  workoutDaysPerWeek?: number;
  preferLowImpact?: boolean;
};

export async function logWorkout(payload: LogWorkoutPayload): Promise<Workout> {
  const res = (await apiFetch("/api/v1/workouts", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as { data: Workout };
  return res.data;
}

export async function listWorkouts(params?: {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: Workout[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  if (params?.page) q.set("page", String(params.page));
  if (params?.pageSize) q.set("pageSize", String(params.pageSize));
  const res = (await apiFetch(`/api/v1/workouts?${q}`)) as { items: Workout[]; total: number };
  return res;
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  await apiFetch(`/api/v1/workouts/${workoutId}`, { method: "DELETE" });
}

export async function updateWorkout(workoutId: string, payload: LogWorkoutPayload): Promise<Workout> {
  const res = (await apiFetch(`/api/v1/workouts/${workoutId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })) as { data: Workout };
  return res.data;
}

export async function getTodayRecommendation(): Promise<WorkoutRecommendation> {
  const res = (await apiFetch("/api/v1/workouts/recommendations/today")) as { data: WorkoutRecommendation };
  return res.data;
}

export async function getWorkoutPreferences(): Promise<WorkoutPreferences> {
  const res = (await apiFetch("/api/v1/workouts/preferences")) as { data: WorkoutPreferences };
  return res.data;
}

export async function getWeeklyRecommendation(): Promise<WorkoutWeekPlan> {
  const res = (await apiFetch("/api/v1/workouts/recommendations/week")) as { data: WorkoutWeekPlan };
  return res.data;
}

export async function updateWorkoutPreferences(
  payload: UpdateWorkoutPreferencesPayload,
): Promise<WorkoutRecommendationBundle> {
  const res = (await apiFetch("/api/v1/workouts/preferences", {
    method: "PUT",
    body: JSON.stringify(payload),
  })) as { data: WorkoutRecommendationBundle };
  return res.data;
}
