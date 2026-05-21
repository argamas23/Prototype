import { apiFetch } from "@/lib/api";
import type { DailyProgressResponse } from "@/types/health";

export async function getDailyProgress(params: {
  dateFrom: string;
  dateTo: string;
}): Promise<DailyProgressResponse> {
  const q = new URLSearchParams();
  q.set("dateFrom", params.dateFrom);
  q.set("dateTo", params.dateTo);
  const res = (await apiFetch(`/api/v1/analytics/daily?${q}`)) as { data: DailyProgressResponse };
  return res.data;
}

