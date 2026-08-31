"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { RecipeThumb } from "@/components/recipe-thumb";
import { UserAvatar } from "@/components/user-avatar";
import { SearchIcon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import {
  createDishOrders,
  getTodayDishOrders,
  updateDishOrderStatus,
} from "@/services/dish-orders";
import { getRecipes } from "@/services/recipes";
import type { DishOrder, DishOrderStatus } from "@/types/dish-order";
import type { RecipeSummary } from "@/types/recipe";

const statusLabels: Record<DishOrderStatus, string> = {
  pending: "待查看",
  viewed: "已查看",
  confirmed: "已确认",
  rejected: "不制作",
  completed: "已完成",
};

const statusOptions: Array<{ value: DishOrderStatus; label: string }> = [
  { value: "pending", label: "待查看" },
  { value: "viewed", label: "已查看" },
  { value: "confirmed", label: "已确认" },
  { value: "rejected", label: "不制作" },
  { value: "completed", label: "已完成" },
];

const statusClasses: Record<DishOrderStatus, string> = {
  pending: "bg-stone-100 text-stone-700",
  viewed: "bg-sky-50 text-sky-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
  completed: "bg-stone-200 text-stone-700",
};

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

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

export function DishOrderWorkspace() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [recipeIndex, setRecipeIndex] = useState<Record<number, RecipeSummary>>({});
  const [orders, setOrders] = useState<DishOrder[]>([]);
  const [search, setSearch] = useState("");
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<number, DishOrderStatus>>({});

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) {
        setLoadingRecipes(true);
        setError(null);
      }

      void (async () => {
        try {
          const items = await getRecipes(search);
          if (active) {
            setRecipes(items);
            setRecipeIndex((current) => {
              const next = { ...current };
              for (const item of items) {
                next[item.id] = item;
              }
              return next;
            });
          }
        } catch (err) {
          if (active) {
            setError(err instanceof ApiError ? err.message : "加载菜谱失败，请重试");
          }
        } finally {
          if (active) {
            setLoadingRecipes(false);
          }
        }
      })();
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (active) {
        setLoadingOrders(true);
        setError(null);
      }

      try {
        const items = await getTodayDishOrders();
        if (active) {
          setOrders(items);
          setStatusDrafts(
            items.reduce<Record<number, DishOrderStatus>>((acc, item) => {
              acc[item.id] = item.status;
              return acc;
            }, {}),
          );
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : "加载今日点菜失败，请重试");
        }
      } finally {
        if (active) {
          setLoadingOrders(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const selectedRecipes = useMemo(
    () =>
      selectedRecipeIds
        .map((recipeId) => recipeIndex[recipeId])
        .filter((item): item is RecipeSummary => Boolean(item)),
    [recipeIndex, selectedRecipeIds],
  );

  const groupedOrders = useMemo(() => groupOrders(orders), [orders]);

  function toggleRecipe(recipeId: number) {
    setMessage(null);
    setError(null);
    setSelectedRecipeIds((current) =>
      current.includes(recipeId)
        ? current.filter((item) => item !== recipeId)
        : [...current, recipeId],
    );
  }

  async function submitSelectedRecipes() {
    if (selectedRecipeIds.length === 0) {
      setError("先选择几道菜再提交");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const items = await createDishOrders({ recipe_ids: selectedRecipeIds });
      setOrders(items);
      setSelectedRecipeIds([]);
      setStatusDrafts(
        items.reduce<Record<number, DishOrderStatus>>((acc, item) => {
          acc[item.id] = item.status;
          return acc;
        }, {}),
      );
      setMessage("已提交点菜单");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "提交点菜失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveOrderStatus(orderId: number) {
    const nextStatus = statusDrafts[orderId];
    if (!nextStatus) {
      return;
    }

    setSavingOrderId(orderId);
    setError(null);
    setMessage(null);

    try {
      const updated = await updateDishOrderStatus(orderId, { status: nextStatus });
      setOrders((current) =>
        current.map((order) => (order.id === updated.id ? updated : order)),
      );
      setStatusDrafts((current) => ({ ...current, [updated.id]: updated.status }));
      setMessage("状态已更新");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "更新状态失败，请重试");
    } finally {
      setSavingOrderId(null);
    }
  }

  return (
    <section className="dish-order-workspace grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
      <div className="section-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="section-title">选择菜谱</h2>
            <p className="section-description">从你的菜谱库里挑选今天想吃的菜，加入家庭后也能和家人共享。</p>
          </div>
          <div className="chip chip-neutral">{recipes.length} 道菜</div>
        </div>

        <label className="mt-4 block">
          <span className="label">搜索菜谱</span>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="field pl-11"
              placeholder="红烧肉、番茄炒蛋..."
            />
          </div>
        </label>

        {loadingRecipes ? (
          <p className="mt-4 text-sm text-stone-500">正在加载菜谱...</p>
        ) : recipes.length === 0 ? (
          <div className="mt-4 empty-state">还没有菜谱，先去菜谱库添加几道吧。</div>
        ) : (
          <div className="mt-4 order-recipe-grid">
            {recipes.map((recipe) => {
              const selected = selectedRecipeIds.includes(recipe.id);

              return (
                <div
                  key={recipe.id}
                  className={`order-recipe-card ${
                    selected
                      ? "border-emerald-200 bg-emerald-50/70"
                      : "border-stone-200 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleRecipe(recipe.id)}
                    aria-pressed={selected}
                    className="order-recipe-select"
                  >
                    <RecipeThumb
                      src={recipe.image_url}
                      title={recipe.title}
                      category={recipe.category}
                      className="aspect-[16/10]"
                    />

                    <div className="mt-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-stone-900">
                            {recipe.title}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            {recipe.cooking_time ? `${recipe.cooking_time} 分钟` : "时长未填"}
                            <span className="mx-1 text-stone-300">·</span>
                            {recipe.difficulty}
                          </p>
                        </div>
                        <span className="chip chip-accent shrink-0">{recipe.category}</span>
                      </div>
                    </div>
                  </button>
                  <Link href={`/recipes/${recipe.id}`} className="order-recipe-link">
                    查看菜谱
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <section className="section-card order-draft-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="section-title">我的点菜单</h2>
              <p className="section-description">选好以后提交；加入家庭后，家人也能看到。</p>
            </div>
            <div className="chip chip-neutral">已选 {selectedRecipes.length} 道</div>
          </div>

          <div className="order-selected-list mt-4">
            {selectedRecipes.length === 0 ? (
              <div className="empty-state">
                <p>还没有选菜。</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">从左侧选几道今晚想吃的菜。</p>
              </div>
            ) : (
              selectedRecipes.map((recipe) => (
                <div key={recipe.id} className="order-selected-item">
                  <RecipeThumb
                    src={recipe.image_url}
                    title={recipe.title}
                    category={recipe.category}
                    className="h-14 w-[4.5rem] shrink-0 rounded-[10px]"
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={`/recipes/${recipe.id}`} className="block truncate font-medium text-stone-900 hover:text-emerald-700">
                      {recipe.title}
                    </Link>
                    <p className="mt-1 text-xs text-stone-500">默认 {recipe.default_servings} 人份</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleRecipe(recipe.id)}
                    aria-label={`移除${recipe.title}`}
                    className="button-ghost button-sm shrink-0"
                  >
                    移除
                  </button>
                </div>
              ))
            )}
          </div>

          {message ? (
            <p className="mt-4 inline-message inline-message-success" role="status">
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 inline-message inline-message-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="order-submit-bar">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900">准备好提交了吗？</p>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                提交后，今天的点菜会同步到家庭菜单。
              </p>
            </div>
            <button
              type="button"
              onClick={submitSelectedRecipes}
              disabled={submitting || selectedRecipeIds.length === 0}
              className="button-primary shrink-0"
            >
              {submitting ? "提交中..." : "提交点菜"}
            </button>
          </div>
        </section>

        <section className="section-card order-today-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="section-title">今日点菜</h2>
              <p className="section-description">家里每个人今天点了什么，一眼看清。</p>
            </div>
            <div className="chip chip-neutral">{orders.length} 条记录</div>
          </div>

          {loadingOrders ? (
            <p className="mt-4 text-sm text-stone-500">正在加载点菜记录...</p>
          ) : groupedOrders.length === 0 ? (
            <div className="mt-4 empty-state">今天还没有人提交点菜。</div>
          ) : (
            <div className="mt-4 space-y-4">
              {groupedOrders.map((group) => (
                <div key={group.userId} className="order-member-group">
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
                        className="order-member-item"
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

                          <span className={`chip ${statusClasses[order.status]}`}>
                            {statusLabels[order.status]}
                          </span>
                        </div>

                        <div className="order-status-controls mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                          <select
                            value={statusDrafts[order.id] ?? order.status}
                            onChange={(event) =>
                              setStatusDrafts((current) => ({
                                ...current,
                                [order.id]: event.target.value as DishOrderStatus,
                              }))
                            }
                            className="select sm:max-w-[180px]"
                          >
                            {statusOptions.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => saveOrderStatus(order.id)}
                            disabled={savingOrderId === order.id}
                            className="button-secondary"
                          >
                            {savingOrderId === order.id ? "保存中..." : "更新状态"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
