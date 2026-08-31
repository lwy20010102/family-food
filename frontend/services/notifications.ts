import { apiRequest } from "@/lib/api";
import type {
  NotificationResponse,
  NotificationsResponse,
} from "@/types/notification";

export async function getNotifications() {
  return apiRequest<NotificationsResponse>("/api/v1/notifications", {
    method: "GET",
    cache: "no-store",
  });
}

export async function readNotification(notificationId: number) {
  const response = await apiRequest<NotificationResponse>(
    `/api/v1/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    },
  );

  return response.notification;
}

export async function readAllNotifications() {
  return apiRequest<NotificationsResponse>("/api/v1/notifications/read-all", {
    method: "PATCH",
  });
}
