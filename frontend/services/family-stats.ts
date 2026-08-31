import { apiRequest } from "@/lib/api";
import type { FamilyMonthlyStatsResponse } from "@/types/family-stats";

export async function getMonthlyFamilyStats() {
  const response = await apiRequest<FamilyMonthlyStatsResponse>(
    "/api/v1/family-stats/monthly",
    {
      method: "GET",
      cache: "no-store",
    },
  );

  return response.stats;
}
