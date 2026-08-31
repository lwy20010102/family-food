import { apiRequest } from "@/lib/api";
import type {
  ShoppingListItemResponse,
  ShoppingListItemUpdatePayload,
  ShoppingListResetResponse,
  ShoppingListTodayResponse,
} from "@/types/shopping-list";

export async function getTodayShoppingList() {
  return apiRequest<ShoppingListTodayResponse>("/api/v1/shopping-lists/today", {
    method: "GET",
    cache: "no-store",
  });
}

export async function updateTodayShoppingListItem(
  itemId: number,
  payload: ShoppingListItemUpdatePayload,
) {
  const response = await apiRequest<ShoppingListItemResponse>(
    `/api/v1/shopping-lists/today/items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return response.item;
}

export async function resetTodayShoppingList() {
  return apiRequest<ShoppingListResetResponse>(
    "/api/v1/shopping-lists/today/reset",
    {
      method: "PATCH",
    },
  );
}
