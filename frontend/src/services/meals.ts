import { apiFetch } from "@/lib/api";
import type { Meal, MealItem, MealType } from "@/types/health";

export type LogMealPayload = {
  mealType: MealType;
  date: string;
  time: string;
  items: Omit<MealItem, "id">[];
};

export async function logMeal(payload: LogMealPayload): Promise<Meal> {
  const res = (await apiFetch("/api/v1/meals", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as { data: Meal };
  return res.data;
}

export async function analyzeImage(file: File): Promise<Omit<MealItem, "id">[]> {
  const formData = new FormData();
  formData.append("file", file);
  const res = (await apiFetch("/api/v1/meals/analyze-image", {
    method: "POST",
    body: formData,
  })) as { data: Omit<MealItem, "id">[] };
  return res.data;
}

export async function listMeals(params?: {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: Meal[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  if (params?.page) q.set("page", String(params.page));
  if (params?.pageSize) q.set("pageSize", String(params.pageSize));
  const res = (await apiFetch(`/api/v1/meals?${q}`)) as { items: Meal[]; total: number };
  return res;
}

export async function deleteMeal(mealId: string): Promise<void> {
  await apiFetch(`/api/v1/meals/${mealId}`, { method: "DELETE" });
}

export async function updateMeal(mealId: string, payload: LogMealPayload): Promise<Meal> {
  const res = (await apiFetch(`/api/v1/meals/${mealId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })) as { data: Meal };
  return res.data;
}
