import { apiRequest } from "@/lib/api";
import type {
  DailyMenuConfirmPayload,
  DailyMenuItemResponse,
  DailyMenuItemStatusUpdatePayload,
  DailyMenuResponse,
  DailyMenuTodayResponse,
} from "@/types/daily-menu";

export async function getTodayMenu() {
  return apiRequest<DailyMenuTodayResponse>("/api/v1/daily-menus/today", {
    method: "GET",
    cache: "no-store",
  });
}

export async function saveTodayMenu(payload: DailyMenuConfirmPayload) {
  const response = await apiRequest<DailyMenuResponse>("/api/v1/daily-menus/today", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return response.menu;
}

export async function updateTodayMenuItemStatus(
  itemId: number,
  payload: DailyMenuItemStatusUpdatePayload,
) {
  const response = await apiRequest<DailyMenuItemResponse>(
    `/api/v1/daily-menus/today/items/${itemId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return response.item;
}
