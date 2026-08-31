import { apiRequest } from "@/lib/api";
import type {
  DishOrderCreatePayload,
  DishOrderResponse,
  DishOrdersResponse,
  DishOrderStatusUpdatePayload,
} from "@/types/dish-order";

export async function getTodayDishOrders() {
  const response = await apiRequest<DishOrdersResponse>(
    "/api/v1/dish-orders/today",
    {
      method: "GET",
      cache: "no-store",
    },
  );

  return response.orders;
}

export async function createDishOrders(payload: DishOrderCreatePayload) {
  const response = await apiRequest<DishOrdersResponse>("/api/v1/dish-orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return response.orders;
}

export async function updateDishOrderStatus(
  orderId: number,
  payload: DishOrderStatusUpdatePayload,
) {
  const response = await apiRequest<DishOrderResponse>(
    `/api/v1/dish-orders/${orderId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return response.order;
}
