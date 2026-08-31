import { apiRequest } from "@/lib/api";
import type {
  WeeklyMenuItemCreatePayload,
  WeeklyMenuItemResponse,
  WeeklyMenuItemServingsPayload,
  WeeklyMenuWeek,
} from "@/types/weekly-menu";

export async function getWeeklyMenu(weekStart?: string) {
  const query = weekStart
    ? `?week_start=${encodeURIComponent(weekStart)}`
    : "";
  return apiRequest<WeeklyMenuWeek>(`/api/v1/weekly-menus${query}`, {
    method: "GET",
    cache: "no-store",
  });
}

export async function addWeeklyMenuItem(payload: WeeklyMenuItemCreatePayload) {
  const response = await apiRequest<WeeklyMenuItemResponse>(
    "/api/v1/weekly-menus/items",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  return response.item;
}

export async function updateWeeklyMenuItemServings(
  itemId: number,
  payload: WeeklyMenuItemServingsPayload,
) {
  const response = await apiRequest<WeeklyMenuItemResponse>(
    `/api/v1/weekly-menus/items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return response.item;
}

export async function deleteWeeklyMenuItem(itemId: number) {
  await apiRequest<void>(`/api/v1/weekly-menus/items/${itemId}`, {
    method: "DELETE",
  });
}
