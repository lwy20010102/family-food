"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { RecipeThumb } from "@/components/recipe-thumb";
import { UserAvatar } from "@/components/user-avatar";
import { ShoppingListPanel } from "@/components/shopping-list-panel";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/services/auth";
import { getCurrentFamily } from "@/services/family";
import {
  getTodayMenu,
  saveTodayMenu,
  updateTodayMenuItemStatus,
} from "@/services/daily-menus";
import type { User } from "@/types/auth";
import type { DailyMenu, DailyMenuItemStatus } from "@/types/daily-menu";
import type { DishOrder } from "@/types/dish-order";
import type { FamilyPublic } from "@/types/family";

const menuStatusLabels: Record<DailyMenuItemStatus, string> = {
  planned: "待制作",
  cooking: "制作中",
  served: "已上桌",
  cancelled: "已取消",
};

const menuStatusOptions: Array<{ value: DailyMenuItemStatus; label: string }> = [
  { value: "planned", label: "待制作" },
  { value: "cooking", label: "制作中" },
  { value: "served", label: "已上桌" },
  { value: "cancelled", label: "已取消" },
];

const menuStatusClasses: Record<DailyMenuItemStatus, string> = {
  planned: "bg-stone-100 text-stone-700",
  cooking: "bg-amber-50 text-amber-700",
  served: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
};

const dishOrderStatusLabels: Record<DishOrder["status"], string> = {
  pending: "待查看",
  viewed: "已查看",
  confirmed: "已确认",
  rejected: "不制作",
  completed: "已完成",
};

const dishOrderStatusClasses: Record<DishOrder["status"], string> = {
  pending: "bg-stone-100 text-stone-700",
  viewed: "bg-sky-50 text-sky-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
  completed: "bg-stone-200 text-stone-700",
};

const menuStateLabels = {
  draft: "待确认",
  confirmed: "已确认",
} satisfies Record<DailyMenu["status"], string>;

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

type MenuCandidate = {
  recipe: DishOrder["recipe"];
  orderCount: number;
  orderedBy: string[];
};

function groupOrders(orders: DishOrder[]) {
  const groups = new Map<number, { userId: number; username: string; orders: DishOrder[] }>();

  for (const order of orders) {
    const current = groups.get(order.user.id);
    if (current) {
      current.orders.push(order);
    } else {
      groups.set(order.user.id, {
        userId: order.user.id,
        username: order.user.username,
        orders: [order],
      });
    }
  }

  return Array.from(groups.values()).sort((left, right) =>
    left.username.localeCompare(right.username, "zh-CN"),
  );
}

function buildCandidateRecipes(orders: DishOrder[], menu: DailyMenu | null) {
  const candidates = new Map<number, MenuCandidate>();

  for (const order of orders) {
    const current = candidates.get(order.recipe.id);
    if (current) {
      current.orderCount += 1;
      if (!current.orderedBy.includes(order.user.username)) {
        current.orderedBy.push(order.user.username);
      }
      continue;
    }

    candidates.set(order.recipe.id, {
      recipe: order.recipe,
      orderCount: 1,
      orderedBy: [order.user.username],
    });
  }

  for (const item of menu?.items ?? []) {
    if (!candidates.has(item.recipe_id)) {
      candidates.set(item.recipe_id, {
        recipe: item.recipe,
        orderCount: 0,
        orderedBy: [],
      });
    }
  }

  return Array.from(candidates.values()).sort((left, right) => {
    if (right.orderCount !== left.orderCount) {
      return right.orderCount - left.orderCount;
    }

    return left.recipe.title.localeCompare(right.recipe.title, "zh-CN");
  });
}

function buildSelectedRecipeIds(orders: DishOrder[], menu: DailyMenu | null) {
  const ids = new Set<number>();

  for (const order of orders) {
    ids.add(order.recipe.id);
  }

  for (const item of menu?.items ?? []) {
    ids.add(item.recipe_id);
  }

  return Array.from(ids);
}

function buildStatusDrafts(menu: DailyMenu | null) {
  if (!menu) {
    return {};
  }

  return menu.items.reduce<Record<number, DailyMenuItemStatus>>((acc, item) => {
    acc[item.id] = item.status;
    return acc;
  }, {});
}

export function DailyMenuWorkspace() {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [family, setFamily] = useState<FamilyPublic | null | undefined>(undefined);
  const [menu, setMenu] = useState<DailyMenu | null>(null);
  const [orders, setOrders] = useState<DishOrder[]>([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<number[]>([]);
  const [servings, setServings] = useState(2);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<
    Record<number, DailyMenuItemStatus>
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const user = await getCurrentUser();
        if (!active) {
          return;
        }

        if (!user) {
          setCurrentUser(null);
          setFamily(null);
          return;
        }

        const familyResponse = await getCurrentFamily();
        if (!active) {
          return;
        }

        setFamily(familyResponse.family);
        setCurrentUser(user);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof ApiError ? err.message : "加载登录状态失败");
        setCurrentUser(null);
        setFamily(null);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let active = true;

    void (async () => {
      setLoadingMenu(true);
      setError(null);
      setMessage(null);

      try {
        const response = await getTodayMenu();
        if (!active) {
          return;
        }

        setOrders(response.orders);
        setMenu(response.menu);
        setSelectedRecipeIds(buildSelectedRecipeIds(response.orders, response.menu));
        setServings(response.menu?.servings ?? 2);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof ApiError ? err.message : "加载今日菜单失败，请重试");
      } finally {
        if (active) {
          setLoadingMenu(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [currentUser]);

  useEffect(() => {
    setStatusDrafts(buildStatusDrafts(menu));
  }, [menu]);

  const groupedOrders = useMemo(() => groupOrders(orders), [orders]);
  const candidateRecipes = useMemo(
    () => buildCandidateRecipes(orders, menu),
    [menu, orders],
  );

  const selectedRecipeCount = selectedRecipeIds.length;
  const canEdit = Boolean(
    currentUser &&
      family !== undefined &&
      (!family || family.creator_id === currentUser.id),
  );
  function toggleRecipe(recipeId: number) {
    if (!canEdit) {
      return;
    }

    setMessage(null);
    setError(null);
    setSelectedRecipeIds((current) =>
      current.includes(recipeId)
        ? current.filter((item) => item !== recipeId)
        : [...current, recipeId],
    );
  }

  async function handleSaveMenu() {
    if (!canEdit) {
      setError("只有家庭创建者可以确认最终菜单");
      return;
    }

    if (selectedRecipeIds.length === 0) {
      setError("先选择几道菜再确认");
      return;
    }

    setSavingMenu(true);
    setError(null);
    setMessage(null);

    try {
      const nextMenu = await saveTodayMenu({
        recipe_ids: selectedRecipeIds,
        servings,
      });
      setMenu(nextMenu);
      setSelectedRecipeIds(nextMenu.items.map((item) => item.recipe_id));
      setServings(nextMenu.servings);
      setMessage("今日菜单已确认");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "确认今日菜单失败，请重试");
    } finally {
      setSavingMenu(false);
    }
  }

  async function handleSaveItemStatus(itemId: number) {
    if (!canEdit) {
      setError("只有家庭创建者可以调整菜品状态");
      return;
    }

    const nextStatus = statusDrafts[itemId];
    if (!nextStatus) {
      return;
    }

    setSavingItemId(itemId);
    setError(null);
    setMessage(null);

    try {
      const updated = await updateTodayMenuItemStatus(itemId, {
        status: nextStatus,
      });
      setMenu((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      setStatusDrafts((current) => ({ ...current, [updated.id]: updated.status }));
      setMessage("菜品状态已更新");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "更新菜品状态失败，请重试");
    } finally {
      setSavingItemId(null);
    }
  }

  if (currentUser === undefined) {
    return (
      <section className="section-card">
        <p className="text-sm text-stone-500">正在检查登录状态...</p>
      </section>
    );
  }

  if (currentUser === null) {
    return (
      <section className="section-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="section-title">今日菜单</h2>
            <p className="section-description">先登录，再查看家庭的今日菜单。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/login" className="button-secondary">
              去登录
            </Link>
            <Link href="/register" className="button-primary">
              去注册
            </Link>
          </div>
        </div>
        {error ? (
          <p className="mt-4 inline-message inline-message-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="daily-menu-workspace space-y-4">
      <div className="section-card daily-menu-summary">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="section-title">今日菜单</h2>
            <p className="section-description">
              先看今天每个人点了什么，再确定最终菜单。
            </p>
          </div>
          <div className="daily-menu-context flex flex-wrap gap-2">
            <span className="chip chip-accent">
              {family ? `当前家庭 · ${family.name}` : "个人空间"}
            </span>
            <span className="chip chip-neutral">
              {menu ? menuStateLabels[menu.status] : "未确认"}
            </span>
            <span className="chip chip-neutral">已选 {selectedRecipeCount} 道</span>
          </div>
        </div>
      </div>

      {error ? (
        <p className="daily-menu-message daily-menu-message-error" role="alert">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="daily-menu-message daily-menu-message-success" role="status">
          {message}
        </p>
      ) : null}

      <div className="daily-menu-flow grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="section-card daily-orders-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h2 className="section-title">{family ? "家庭点菜" : "我的点菜"}</h2>
                <p className="section-description">
                  {family
                    ? "先看今天每个人点了什么，再确定最终菜单。"
                    : "先选好今天想吃的菜，再确认最终菜单。"}
                </p>
            </div>
            <div className="chip chip-neutral">{orders.length} 条记录</div>
          </div>

          {loadingMenu ? (
            <p className="mt-4 text-sm text-stone-500">正在加载今日菜单...</p>
          ) : groupedOrders.length === 0 ? (
            <div className="mt-4 empty-state">
              {family ? "今天还没有人提交点菜。" : "今天还没有提交点菜。"}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {groupedOrders.map((group) => (
                <div key={group.userId} className="daily-order-group">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={group.username} />
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{group.username}</p>
                      <p className="mt-1 text-xs text-stone-500">{group.orders.length} 道菜</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {group.orders.map((order) => (
                      <div
                        key={order.id}
                        className="daily-order-item"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <RecipeThumb
                              src={order.recipe.image_url}
                              title={order.recipe.title}
                              category={order.recipe.category}
                              className="h-16 w-20 shrink-0 aspect-[5/4]"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-stone-900">{order.recipe.title}</p>
                              <p className="mt-1 text-xs text-stone-500">
                                {order.recipe.category}
                                {order.recipe.cooking_time
                                  ? ` · ${order.recipe.cooking_time} 分钟`
                                  : ""}
                                {` · ${dateTimeFormatter.format(new Date(order.created_at))}`}
                              </p>
                            </div>
                          </div>

                          <span className={`chip ${dishOrderStatusClasses[order.status]}`}>
                            {dishOrderStatusLabels[order.status]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="daily-menu-plan space-y-4">
          <section className="section-card daily-confirm-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="section-title">确认最终菜单</h2>
                <p className="section-description">
                  选择今天要做的菜，并设置今天吃几个人份。
                </p>
              </div>
              <div className="chip chip-neutral">已选 {selectedRecipeCount} 道</div>
            </div>

            <label className="mt-4 block">
              <span className="label">今天几个人吃</span>
              <input
                type="number"
                min={1}
                max={20}
                value={servings}
                onChange={(event) => setServings(Number(event.target.value) || 1)}
                disabled={!canEdit}
                className="field"
              />
            </label>

            <div className="mt-4 space-y-3">
              {candidateRecipes.length === 0 ? (
                <div className="empty-state">还没有点菜，先去点菜页选几道菜。</div>
              ) : (
                candidateRecipes.map((candidate) => {
                  const selected = selectedRecipeIds.includes(candidate.recipe.id);

                  return (
                    <label
                      key={candidate.recipe.id}
                      className={`daily-candidate-card ${
                        selected
                          ? "border-emerald-200 bg-emerald-50/70"
                          : "border-stone-200 bg-white hover:border-emerald-200 hover:shadow-[0_20px_50px_rgba(15,23,42,0.10)]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleRecipe(candidate.recipe.id)}
                          disabled={!canEdit || savingMenu}
                          className="mt-2 h-4 w-4 rounded border-stone-300 text-emerald-600 accent-emerald-600"
                        />

                        <RecipeThumb
                          src={candidate.recipe.image_url}
                          title={candidate.recipe.title}
                          category={candidate.recipe.category}
                          className="h-20 w-24 shrink-0 aspect-[5/4]"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="font-medium text-stone-900">
                                {candidate.recipe.title}
                              </p>
                              <p className="mt-1 text-xs text-stone-500">
                                {candidate.recipe.category}
                                {candidate.recipe.cooking_time
                                  ? ` · ${candidate.recipe.cooking_time} 分钟`
                                  : ""}
                                {` · 默认 ${candidate.recipe.default_servings} 人份`}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="chip chip-neutral">
                                {candidate.orderCount} 份点菜
                              </span>
                              {candidate.orderedBy.length ? (
                                <span className="text-xs text-stone-500">
                                  {candidate.orderedBy.join("、")}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="daily-menu-confirm-action">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-900">最终菜单</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  确认后会自动生成今天的采购清单。
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveMenu}
                disabled={!canEdit || savingMenu || selectedRecipeIds.length === 0}
                className="button-primary shrink-0"
              >
                {savingMenu
                  ? "确认中..."
                  : menu
                    ? "更新今日菜单"
                    : "确认今日菜单"}
              </button>
            </div>

            {!canEdit ? (
              <p className="mt-3 text-xs leading-5 text-stone-500">
                {family ? "只有家庭创建者可以确认最终菜单。" : "个人空间可以直接确认今日菜单。"}
              </p>
            ) : null}
          </section>

          <ShoppingListPanel menu={menu} />

          <section className="section-card daily-status-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="section-title">菜品状态</h2>
                <p className="section-description">
                  确认后可以继续调整每道菜的状态。
                </p>
              </div>
              <div className="chip chip-neutral">
                {menu?.items.length ?? 0} 道菜
              </div>
            </div>

            {loadingMenu ? (
              <p className="mt-4 text-sm text-stone-500">正在加载今日菜单...</p>
            ) : menu?.items.length ? (
              <div className="mt-4 space-y-3">
                {menu.items.map((item) => (
                  <div key={item.id} className="daily-menu-item-card">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <RecipeThumb
                          src={item.recipe.image_url}
                          title={item.recipe.title}
                          category={item.recipe.category}
                          className="h-16 w-20 shrink-0 aspect-[5/4]"
                        />
                        <div>
                          <p className="font-medium text-stone-900">{item.recipe.title}</p>
                          <p className="mt-1 text-xs text-stone-500">
                            {item.recipe.category}
                            {item.recipe.cooking_time
                              ? ` · ${item.recipe.cooking_time} 分钟`
                              : ""}
                            {menu ? ` · ${menu.servings} 人份` : ""}
                          </p>
                        </div>
                      </div>
                      <span className={`chip ${menuStatusClasses[item.status]}`}>
                        {menuStatusLabels[item.status]}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <select
                        value={statusDrafts[item.id] ?? item.status}
                        onChange={(event) =>
                          setStatusDrafts((current) => ({
                            ...current,
                            [item.id]: event.target.value as DailyMenuItemStatus,
                          }))
                        }
                        disabled={!canEdit}
                        className="select sm:max-w-[180px]"
                      >
                        {menuStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleSaveItemStatus(item.id)}
                        disabled={!canEdit || savingItemId === item.id}
                        className="button-secondary"
                      >
                        {savingItemId === item.id ? "保存中..." : "更新状态"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 empty-state">
                先确认今日菜单，这里才会出现菜品状态。
              </div>
            )}
          </section>

          {menu ? (
            <section className="section-card daily-confirm-info">
              <div>
                <h2 className="section-title">确认信息</h2>
                <p className="section-description">
                  方便快速确认是谁定下了今天这份菜单。
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[16px] bg-stone-50 px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
                    确认人
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stone-900">
                    {menu.confirmed_by?.username ?? "未确认"}
                  </p>
                </div>
                <div className="rounded-[16px] bg-stone-50 px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
                    确认时间
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stone-900">
                    {menu.confirmed_at
                      ? dateTimeFormatter.format(new Date(menu.confirmed_at))
                      : "未确认"}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

        </div>
      </div>
    </section>
  );
}
