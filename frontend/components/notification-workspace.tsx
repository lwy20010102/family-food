"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { UserAvatar } from "@/components/user-avatar";
import { ApiError } from "@/lib/api";
import {
  getNotifications,
  readAllNotifications,
  readNotification,
} from "@/services/notifications";
import type { Notification } from "@/types/notification";

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

type NotificationCategory = "all" | "orders" | "menu" | "family";

const notificationCategoryOptions: Array<{
  value: NotificationCategory;
  label: string;
}> = [
  { value: "all", label: "全部" },
  { value: "orders", label: "点菜" },
  { value: "menu", label: "菜单" },
  { value: "family", label: "家庭" },
];

function getNotificationCategory(type: string): Exclude<NotificationCategory, "all"> {
  if (type.startsWith("dish_order") || type.startsWith("order")) {
    return "orders";
  }

  if (type.startsWith("menu") || type.startsWith("daily_menu")) {
    return "menu";
  }

  return "family";
}

function getNotificationCategoryLabel(type: string) {
  const category = getNotificationCategory(type);
  return notificationCategoryOptions.find((item) => item.value === category)?.label ?? "家庭";
}

function getNotificationActionLabel(notification: Notification) {
  if (notification.link_url?.startsWith("/orders")) {
    return "查看点菜";
  }

  if (notification.link_url?.startsWith("/menu")) {
    return "查看菜单";
  }

  if (notification.link_url?.startsWith("/family")) {
    return "查看家庭";
  }

  return "查看";
}

export function NotificationWorkspace() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [category, setCategory] = useState<NotificationCategory>("all");

  useEffect(() => {
    let active = true;
    let intervalId: number | undefined;

    const loadNotifications = async () => {
      const response = await getNotifications();
      if (!active) {
        return;
      }

      setError(null);
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    };

    void (async () => {
      try {
        intervalId = window.setInterval(() => {
          if (!active) {
            return;
          }

          void loadNotifications().catch((err) => {
            if (!active) {
              return;
            }

            setError(
              err instanceof ApiError ? err.message : "刷新通知失败，请重试",
            );
          });
        }, 30000);

        try {
          await loadNotifications();
        } catch (err) {
          if (!active) {
            return;
          }

          if (err instanceof ApiError && err.status === 401) {
            setError("请先登录");
          } else {
            setError(err instanceof ApiError ? err.message : "加载通知失败，请重试");
          }
        }
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          setError("请先登录");
        } else {
          setError(err instanceof ApiError ? err.message : "加载通知失败，请重试");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  async function handleRead(notification: Notification) {
    if (notification.is_read) {
      return;
    }

    setMarkingId(notification.id);
    setError(null);

    try {
      const updated = await readNotification(notification.id);
      setNotifications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setUnreadCount((current) => Math.max(current - 1, 0));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "标记已读失败，请重试");
    } finally {
      setMarkingId(null);
    }
  }

  async function handleReadAll() {
    setMarkingAll(true);
    setError(null);

    try {
      const response = await readAllNotifications();
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "批量标记失败，请重试");
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleOpen(notification: Notification) {
    if (notification.link_url) {
      await handleRead(notification);
      router.push(notification.link_url);
      return;
    }

    await handleRead(notification);
  }

  const filteredNotifications = useMemo(
    () =>
      category === "all"
        ? notifications
        : notifications.filter(
            (notification) => getNotificationCategory(notification.type) === category,
          ),
    [category, notifications],
  );

  if (loading) {
    return (
      <section className="section-card">
        <div className="space-y-3">
          <div className="h-5 w-28 animate-pulse rounded-full bg-stone-200" />
          <div className="h-4 w-56 animate-pulse rounded-full bg-stone-100" />
          <div className="space-y-3 pt-2">
            <div className="h-24 animate-pulse rounded-[16px] bg-stone-100" />
            <div className="h-24 animate-pulse rounded-[16px] bg-stone-100" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="section-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="section-title">通知中心</h2>
            <p className="section-description">个人空间显示自己的消息，加入家庭后会同步家人的点菜通知。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-accent">未读 {unreadCount}</span>
            <button
              type="button"
              onClick={handleReadAll}
              disabled={markingAll || notifications.length === 0 || unreadCount === 0}
              className="button-secondary"
            >
              {markingAll ? "处理中..." : "全部标为已读"}
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 inline-message inline-message-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="notification-category-filters" aria-label="通知分类">
          {notificationCategoryOptions.map((item) => (
            <button
              key={item.value}
              type="button"
              className="notification-category-filter"
              data-active={category === item.value}
              onClick={() => setCategory(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="empty-state bg-white">
          {notifications.length === 0
            ? "还没有通知。家人提交点菜、确认菜单或加入家庭时，这里会自动出现消息。"
            : "这个分类下暂时没有通知。可以切换其他分类查看。"}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <article
              key={notification.id}
              className={`rounded-[16px] border p-4 transition ${
                notification.is_read
                  ? "border-white/80 bg-white"
                  : "border-emerald-100 bg-emerald-50/70"
              }`}
              style={{ boxShadow: "var(--ff-shadow-soft)" }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <UserAvatar name={notification.sender.username} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-stone-900">
                        {notification.title}
                      </h3>
                      <span className="chip chip-neutral">
                        {getNotificationCategoryLabel(notification.type)}
                      </span>
                      {!notification.is_read ? (
                        <span className="chip chip-accent">未读</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-stone-500">
                      {notification.sender.username} ·{" "}
                      {dateTimeFormatter.format(new Date(notification.created_at))}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-stone-700">
                      {notification.content}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {notification.link_url ? (
                    <button
                      type="button"
                      onClick={() => handleOpen(notification)}
                      disabled={markingId === notification.id}
                      className="button-primary"
                    >
                      {markingId === notification.id
                        ? "查看中..."
                        : getNotificationActionLabel(notification)}
                    </button>
                  ) : null}

                  {!notification.is_read ? (
                    <button
                      type="button"
                      onClick={() => handleRead(notification)}
                      disabled={markingId === notification.id}
                      className="button-secondary"
                    >
                      {markingId === notification.id ? "处理中..." : "标记已读"}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
