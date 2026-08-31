import type { User } from "@/types/auth";

export type Notification = {
  id: number;
  family_id: number;
  sender_id: number;
  receiver_id: number;
  type: string;
  title: string;
  content: string;
  related_id: number | null;
  link_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender: User;
};

export type NotificationsResponse = {
  notifications: Notification[];
  unread_count: number;
};

export type NotificationResponse = {
  notification: Notification;
};
