import { apiFetch } from "@/lib/api";
import type { DashboardSummary } from "@/types/health";

export async function getDashboard(date?: string): Promise<DashboardSummary> {
  const q = date ? `?date=${date}` : "";
  const res = (await apiFetch(`/api/v1/dashboard${q}`)) as { data: DashboardSummary };
  return res.data;
}
