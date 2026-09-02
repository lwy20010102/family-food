import { apiRequest } from "@/lib/api";
import type {
  DailyMenuConfirmPayload,
  DailyMenuFeedbackChoice,
  DailyMenuFeedbackResponse,
  DailyMenuItemResponse,
  DailyMenuItemStatusUpdatePayload,
  DailyMenuResponse,
  DailyMenuTodayResponse,
  DailyMenuViewResponse,
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

export async function publishTodayMenu(payload: DailyMenuConfirmPayload) {
  const response = await apiRequest<DailyMenuResponse>(
    "/api/v1/daily-menus/today/publish",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

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

export async function saveTodayMenuFeedback(
  recipeId: number,
  preference: DailyMenuFeedbackChoice,
) {
  const response = await apiRequest<DailyMenuFeedbackResponse>(
    "/api/v1/daily-menus/today/feedback",
    {
      method: "PUT",
      body: JSON.stringify({ recipe_id: recipeId, preference }),
    },
  );

  return response.feedback;
}

export async function saveTodayMenuView(viewed: boolean) {
  const response = await apiRequest<DailyMenuViewResponse>(
    "/api/v1/daily-menus/today/view",
    {
      method: "PUT",
      body: JSON.stringify({ viewed }),
    },
  );

  return response.view;
}

export async function restoreTodayMenuVersion(versionId: number) {
  const response = await apiRequest<DailyMenuResponse>(
    `/api/v1/daily-menus/today/versions/${versionId}/restore`,
    {
      method: "POST",
    },
  );

  return response.menu;
}
