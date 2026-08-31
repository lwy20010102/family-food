"use client";

import { useEffect, useMemo, useState } from "react";

import { ApiError } from "@/lib/api";
import {
  getTodayShoppingList,
  resetTodayShoppingList,
  updateTodayShoppingListItem,
} from "@/services/shopping-lists";
import type { DailyMenu } from "@/types/daily-menu";
import type { ShoppingList, ShoppingListItem } from "@/types/shopping-list";

type ShoppingListFilter = "all" | "pending" | "purchased";

const filterOptions: Array<{ value: ShoppingListFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "pending", label: "未购买" },
  { value: "purchased", label: "已购买" },
];

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatItemAmount(item: ShoppingListItem) {
  const amount = item.amount.trim();
  const unit = item.unit.trim();

  if (amount && unit) {
    return `${amount}${unit}`;
  }

  return amount || unit || "待补充";
}

function getItemStatusLabel(isPurchased: boolean) {
  return isPurchased ? "已购买" : "未购买";
}

export function ShoppingListPanel({
  menu,
}: {
  menu: DailyMenu | null;
}) {
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<ShoppingListFilter>("all");
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  const [markingAllPurchased, setMarkingAllPurchased] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        const response = await getTodayShoppingList();
        if (!active) {
          return;
        }

        setShoppingList(response.shopping_list);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof ApiError ? err.message : "加载采购清单失败，请重试",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [menu?.updated_at]);

  const items = shoppingList?.items ?? [];
  const purchasedCount = useMemo(
    () => items.filter((item) => item.is_purchased).length,
    [items],
  );
  const pendingCount = items.length - purchasedCount;

  const visibleItems = useMemo(() => {
    if (filter === "pending") {
      return items.filter((item) => !item.is_purchased);
    }

    if (filter === "purchased") {
      return items.filter((item) => item.is_purchased);
    }

    return items;
  }, [filter, items]);

  async function handleToggleItem(item: ShoppingListItem, nextPurchased: boolean) {
    setSavingItemId(item.id);
    setError(null);
    setMessage(null);

    try {
      const updated = await updateTodayShoppingListItem(item.id, {
        is_purchased: nextPurchased,
      });

      setShoppingList((current) =>
        current
          ? {
              ...current,
              items: current.items.map((currentItem) =>
                currentItem.id === updated.id ? updated : currentItem,
              ),
            }
          : current,
      );
      setMessage(
        `${updated.name} 已${updated.is_purchased ? "标记为已购买" : "取消购买"}`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "更新采购状态失败，请重试");
    } finally {
      setSavingItemId(null);
    }
  }

  async function handleReset() {
    if (!shoppingList || shoppingList.items.length === 0) {
      return;
    }

    if (!window.confirm("确定要重置所有采购状态吗？")) {
      return;
    }

    setResetting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await resetTodayShoppingList();
      setShoppingList(response.shopping_list);
      setFilter("all");
      setMessage("采购状态已重置");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "重置采购状态失败，请重试");
    } finally {
      setResetting(false);
    }
  }

  async function handleMarkAllPurchased() {
    const pendingItems = items.filter((item) => !item.is_purchased);
    if (pendingItems.length === 0 || markingAllPurchased) {
      return;
    }

    setMarkingAllPurchased(true);
    setError(null);
    setMessage(null);

    try {
      const results = await Promise.allSettled(
        pendingItems.map((item) =>
          updateTodayShoppingListItem(item.id, { is_purchased: true }),
        ),
      );
      const updatedItems: ShoppingListItem[] = [];
      let failedCount = 0;

      for (const result of results) {
        if (result.status === "fulfilled") {
          updatedItems.push(result.value);
        } else {
          failedCount += 1;
        }
      }

      if (updatedItems.length > 0) {
        const updatedById = new Map(
          updatedItems.map((item) => [item.id, item]),
        );
        setFilter("all");
        setShoppingList((current) =>
          current
            ? {
                ...current,
                items: current.items.map(
                  (item) => updatedById.get(item.id) ?? item,
                ),
              }
            : current,
        );
      }

      if (failedCount > 0) {
        setError(
          `${updatedItems.length} 项已标记为已购买，${failedCount} 项更新失败，请重试。`,
        );
      } else {
        setMessage(`已将 ${updatedItems.length} 项标记为已购买`);
      }
    } catch {
      setError("批量更新采购状态失败，请重试");
    } finally {
      setMarkingAllPurchased(false);
    }
  }

  const menuReady = menu?.status === "confirmed";
  const selectedDishCount = menu?.items.length ?? 0;
  const expectedServings = menu?.servings ?? 0;
  const allPurchased = items.length > 0 && pendingCount === 0;
  const completionPercent = items.length
    ? Math.round((purchasedCount / items.length) * 100)
    : 0;

  return (
    <section
      id="shopping-list"
      className="section-card scroll-mt-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="section-title">今日食材清单</h2>
          <p className="section-description">
            按今日最终菜单自动汇总食材，同名同单位会合并在一起。
          </p>
          {menuReady && menu?.confirmed_at ? (
            <p className="mt-2 text-xs text-stone-500">
              来源：{menu.confirmed_by?.username ?? "家庭创建者"} ·{" "}
              {dateTimeFormatter.format(new Date(menu.confirmed_at))}
            </p>
          ) : (
            <p className="mt-2 text-xs text-stone-500">
              先确认今日菜单，采购清单会自动生成。
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="chip chip-neutral">
            {menuReady ? "已生成" : "待确认"}
          </span>
          <span className="chip chip-neutral">
            已完成 {purchasedCount}/{items.length}
          </span>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || markingAllPurchased || items.length === 0}
            className="button-secondary"
          >
            {resetting ? "重置中..." : "重置采购状态"}
          </button>
        </div>
      </div>

      <div className="shopping-list-overview" aria-label="今日食材概览">
        <div className="shopping-list-stat">
          <span className="shopping-list-stat-label">已选择</span>
          <strong>{menuReady ? selectedDishCount : 0}</strong>
          <span>道菜</span>
        </div>
        <div className="shopping-list-stat">
          <span className="shopping-list-stat-label">预计</span>
          <strong>{menuReady ? expectedServings : "—"}</strong>
          <span>{menuReady ? "人" : ""}</span>
        </div>
        <div className="shopping-list-stat shopping-list-stat-progress col-span-2 sm:col-span-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="shopping-list-stat-label">已完成</span>
            <span className="text-xs text-stone-500">
              {purchasedCount}/{items.length} 项
            </span>
          </div>
          <div
            className="shopping-list-progress-track"
            role="progressbar"
            aria-label="采购完成进度"
            aria-valuemin={0}
            aria-valuemax={items.length || 1}
            aria-valuenow={purchasedCount}
          >
            <span style={{ width: `${completionPercent}%` }} />
          </div>
        </div>
      </div>

        {error ? (
          <p
          className="mt-4 inline-message inline-message-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

        {message ? (
          <p
          className="mt-4 inline-message inline-message-success"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-stone-500">正在生成采购清单...</p>
      ) : !menuReady ? (
        <div className="mt-4 empty-state">
          先确认今日菜单，系统才会自动生成采购清单。
        </div>
      ) : shoppingList === null ? (
        <div className="mt-4 empty-state">
          采购清单暂时还没生成，稍后刷新一下看看。
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 empty-state">今日菜单里暂时没有可统计的食材。</div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => {
              const count =
                option.value === "all"
                  ? items.length
                  : option.value === "pending"
                    ? pendingCount
                    : purchasedCount;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`nav-pill transition ${
                    filter === option.value
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-stone-100 text-stone-600 hover:bg-white hover:text-emerald-800"
                  }`}
                >
                  {option.label} {count}
                </button>
              );
            })}
          </div>

          {visibleItems.length === 0 ? (
            <div className="empty-state">这个筛选下没有采购项。</div>
          ) : (
            <div className="space-y-2">
              {visibleItems.map((item) => {
                const checked = item.is_purchased;

                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-[14px] border px-4 py-3 transition ${
                      checked
                        ? "border-emerald-100 bg-emerald-50/70"
                        : "border-stone-200 bg-white hover:border-emerald-200 hover:bg-emerald-50"
                    }`}
                    style={{ boxShadow: "var(--ff-shadow-soft)" }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        void handleToggleItem(item, event.target.checked)
                      }
                      disabled={
                        savingItemId === item.id || resetting || markingAllPurchased
                      }
                      className="mt-1 h-4 w-4 rounded border-stone-300 text-emerald-600 accent-emerald-600"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={`font-medium ${
                              checked ? "text-stone-500 line-through" : "text-stone-900"
                            }`}
                          >
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            {formatItemAmount(item)}
                          </p>
                        </div>
                        <span className="chip chip-neutral">
                          {getItemStatusLabel(checked)}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="shopping-list-complete-bar">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900">
                {allPurchased ? "今天的采购已完成" : `还剩 ${pendingCount} 项待购买`}
              </p>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                {allPurchased
                  ? "所有食材都已标记，可以安心准备晚餐。"
                  : "买齐后可以一键更新整张清单。"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleMarkAllPurchased()}
              disabled={allPurchased || markingAllPurchased || resetting}
              className="button-primary shrink-0"
            >
              {markingAllPurchased
                ? "更新中..."
                : allPurchased
                  ? "全部已购买"
                  : "全部标记已购买"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
