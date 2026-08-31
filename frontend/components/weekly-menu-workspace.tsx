"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import { RecipeThumb } from "@/components/recipe-thumb";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/services/auth";
import { getCurrentFamily } from "@/services/family";
import { getRecipes } from "@/services/recipes";
import {
  addWeeklyMenuItem,
  deleteWeeklyMenuItem,
  getWeeklyMenu,
  updateWeeklyMenuItemServings,
} from "@/services/weekly-menus";
import type { User } from "@/types/auth";
import type { FamilyPublic } from "@/types/family";
import type { RecipeSummary } from "@/types/recipe";
import type {
  WeeklyMenuDay,
  WeeklyMenuItem,
  WeeklyMenuMealType,
  WeeklyMenuWeek,
} from "@/types/weekly-menu";

const mealTypes: Array<{
  value: WeeklyMenuMealType;
  label: string;
  hint: string;
}> = [
  { value: "breakfast", label: "早餐", hint: "开启一天" },
  { value: "lunch", label: "午餐", hint: "中午吃好" },
  { value: "dinner", label: "晚餐", hint: "今晚安排" },
];

const weekdayFormatter = new Intl.DateTimeFormat("zh-CN", {
  weekday: "short",
});
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
});

function toDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getWeekStart(value: Date) {
  const result = new Date(value);
  const day = result.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + mondayOffset);
  return result;
}

function moveDate(value: string, offset: number) {
  const result = fromDateInput(value);
  result.setDate(result.getDate() + offset);
  return toDateInput(result);
}

function isToday(value: string) {
  return value === toDateInput(new Date());
}

function formatDay(value: string) {
  return weekdayFormatter.format(fromDateInput(value)).replace("周", "");
}

function formatDate(value: string) {
  return dateFormatter.format(fromDateInput(value));
}

function updateWeekItem(
  week: WeeklyMenuWeek,
  updatedItem: WeeklyMenuItem,
): WeeklyMenuWeek {
  return {
    ...week,
    days: week.days.map((day) => ({
      ...day,
      items: day.items.map((item) =>
        item.id === updatedItem.id ? updatedItem : item,
      ),
    })),
  };
}

function appendWeekItem(week: WeeklyMenuWeek, newItem: WeeklyMenuItem) {
  return {
    ...week,
    days: week.days.map((day) =>
      day.menu_date === newItem.menu_date
        ? { ...day, items: [...day.items, newItem] }
        : day,
    ),
  };
}

function removeWeekItem(week: WeeklyMenuWeek, itemId: number) {
  return {
    ...week,
    days: week.days.map((day) => ({
      ...day,
      items: day.items.filter((item) => item.id !== itemId),
    })),
  };
}

export function WeeklyMenuWorkspace() {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(
    undefined,
  );
  const [family, setFamily] = useState<FamilyPublic | null | undefined>(
    undefined,
  );
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [week, setWeek] = useState<WeeklyMenuWeek | null>(null);
  const [weekStart, setWeekStart] = useState(() =>
    toDateInput(getWeekStart(new Date())),
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    toDateInput(new Date()),
  );
  const [selectedMeal, setSelectedMeal] =
    useState<WeeklyMenuMealType>("dinner");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [servings, setServings] = useState(2);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
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
          setLoadingWorkspace(false);
          return;
        }

        const [familyResponse, recipeList] = await Promise.all([
          getCurrentFamily(),
          getRecipes(),
        ]);
        if (!active) {
          return;
        }

        setCurrentUser(user);
        setFamily(familyResponse.family);
        setRecipes(recipeList);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof ApiError ? err.message : "加载工作区失败，请重试");
        setCurrentUser(null);
        setFamily(null);
      } finally {
        if (active) {
          setLoadingWorkspace(false);
        }
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
    setLoadingWeek(true);
    setError(null);

    void (async () => {
      try {
        const response = await getWeeklyMenu(weekStart);
        if (!active) {
          return;
        }

        setWeek(response);
        setSelectedDate((current) => {
          const dates = response.days.map((day) => day.menu_date);
          return dates.includes(current) ? current : response.week_start;
        });
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : "加载周菜单失败，请重试");
        }
      } finally {
        if (active) {
          setLoadingWeek(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [currentUser, weekStart]);

  const selectedDay: WeeklyMenuDay | undefined = useMemo(
    () => week?.days.find((day) => day.menu_date === selectedDate),
    [selectedDate, week],
  );
  const selectedMealInfo = mealTypes.find((meal) => meal.value === selectedMeal);
  const mealItems = useMemo(
    () => selectedDay?.items.filter((item) => item.meal_type === selectedMeal) ?? [],
    [selectedDay, selectedMeal],
  );
  const scheduledRecipeIds = useMemo(
    () => new Set(mealItems.map((item) => item.recipe_id)),
    [mealItems],
  );
  const availableRecipes = useMemo(
    () => recipes.filter((recipe) => !scheduledRecipeIds.has(recipe.id)),
    [recipes, scheduledRecipeIds],
  );
  const plannedItemCount = useMemo(
    () => week?.days.reduce((total, day) => total + day.items.length, 0) ?? 0,
    [week],
  );

  useEffect(() => {
    if (
      !selectedRecipeId ||
      !availableRecipes.some((recipe) => String(recipe.id) === selectedRecipeId)
    ) {
      setSelectedRecipeId(
        availableRecipes[0] ? String(availableRecipes[0].id) : "",
      );
    }
  }, [availableRecipes, selectedRecipeId]);

  function changeWeek(offset: number) {
    const nextStart = moveDate(weekStart, offset * 7);
    setWeekStart(nextStart);
    setSelectedDate(nextStart);
    setMessage(null);
    setError(null);
  }

  function goToCurrentWeek() {
    const today = toDateInput(new Date());
    const nextStart = toDateInput(getWeekStart(new Date()));
    setWeekStart(nextStart);
    setSelectedDate(today);
    setMessage(null);
    setError(null);
  }

  function selectDate(value: string) {
    setSelectedDate(value);
    setMessage(null);
    setError(null);
  }

  async function handleAddItem() {
    if (!selectedRecipeId || !selectedDay || !currentUser) {
      setError("先选择一道菜谱");
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const item = await addWeeklyMenuItem({
        menu_date: selectedDate,
        meal_type: selectedMeal,
        recipe_id: Number(selectedRecipeId),
        servings,
      });
      setWeek((current) => (current ? appendWeekItem(current, item) : current));
      setMessage(`${item.recipe.title} 已加入${selectedMealInfo?.label ?? "餐次"}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "添加周菜单失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeServings(item: WeeklyMenuItem, delta: number) {
    const nextServings = Math.min(20, Math.max(1, item.servings + delta));
    if (nextServings === item.servings) {
      return;
    }

    setSavingItemId(item.id);
    setMessage(null);
    setError(null);

    try {
      const updatedItem = await updateWeeklyMenuItemServings(item.id, {
        servings: nextServings,
      });
      setWeek((current) =>
        current ? updateWeekItem(current, updatedItem) : current,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "更新人数失败，请重试");
    } finally {
      setSavingItemId(null);
    }
  }

  async function handleDeleteItem(item: WeeklyMenuItem) {
    if (!window.confirm(`确定从周菜单中移除“${item.recipe.title}”吗？`)) {
      return;
    }

    setDeletingItemId(item.id);
    setMessage(null);
    setError(null);

    try {
      await deleteWeeklyMenuItem(item.id);
      setWeek((current) =>
        current ? removeWeekItem(current, item.id) : current,
      );
      setMessage(`${item.recipe.title} 已从周菜单移除`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "移除周菜单失败，请重试");
    } finally {
      setDeletingItemId(null);
    }
  }

  if (loadingWorkspace || currentUser === undefined) {
    return (
      <section className="section-card weekly-loading" aria-busy="true">
        <div className="weekly-loading-line weekly-loading-title" />
        <div className="weekly-loading-line" />
        <div className="weekly-loading-grid">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="weekly-loading-day" />
          ))}
        </div>
      </section>
    );
  }

  if (currentUser === null) {
    return (
      <section className="section-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">登录后安排每周菜单</h2>
            <p className="section-description">登录后即可在个人空间使用完整的周菜单功能。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/login" className="button-secondary">去登录</Link>
            <Link href="/register" className="button-primary">去注册</Link>
          </div>
        </div>
        {error ? <p className="mt-4 weekly-message weekly-message-error" role="alert">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="weekly-menu-workspace space-y-4">
      <section className="section-card weekly-overview">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="section-title">一周安排</h2>
              <span className="chip chip-accent">{family ? `当前家庭 · ${family.name}` : "个人空间"}</span>
            </div>
            <p className="section-description">
              {formatDate(week?.week_start ?? weekStart)} - {formatDate(week?.week_end ?? moveDate(weekStart, 6))} · 已安排 {plannedItemCount} 道菜
            </p>
          </div>
          <div className="weekly-week-controls">
            <button type="button" className="button-secondary weekly-icon-button" onClick={() => changeWeek(-1)} aria-label="上一周" title="上一周">
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <button type="button" className="button-secondary" onClick={goToCurrentWeek}>本周</button>
            <button type="button" className="button-secondary weekly-icon-button" onClick={() => changeWeek(1)} aria-label="下一周" title="下一周">
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="weekly-date-strip" aria-label="选择日期">
          {(week?.days ?? []).map((day) => {
            const selected = day.menu_date === selectedDate;
            const itemCount = day.items.length;
            return (
              <button
                type="button"
                key={day.menu_date}
                className="weekly-date-button"
                data-selected={selected}
                onClick={() => selectDate(day.menu_date)}
                aria-pressed={selected}
              >
                <span className="weekly-date-weekday">{formatDay(day.menu_date)}</span>
                <strong>{formatDate(day.menu_date)}</strong>
                <span className="weekly-date-count">{itemCount ? `${itemCount} 道菜` : "未安排"}</span>
                {isToday(day.menu_date) ? <span className="weekly-today-dot" aria-label="今天" /> : null}
              </button>
            );
          })}
        </div>
      </section>

      {error ? <p className="weekly-message weekly-message-error" role="alert">{error}</p> : null}
      {message ? <p className="weekly-message weekly-message-success" role="status">{message}</p> : null}

      <div className="weekly-plan-layout">
        <section className="section-card weekly-day-panel">
          <div className="section-head">
            <div>
              <p className="weekly-selected-date">{isToday(selectedDate) ? "今天 · " : ""}{formatDate(selectedDate)} {formatDay(selectedDate)}</p>
              <h2 className="section-title">当天安排</h2>
              <p className="section-description">点击餐次，查看和调整这一天的菜谱。</p>
            </div>
            <span className="chip chip-neutral">{selectedDay?.items.length ?? 0} 道菜</span>
          </div>

          <div className="weekly-meal-tabs" role="tablist" aria-label="选择餐次">
            {mealTypes.map((meal) => (
              <button
                type="button"
                key={meal.value}
                role="tab"
                aria-selected={selectedMeal === meal.value}
                className="weekly-meal-tab"
                data-selected={selectedMeal === meal.value}
                onClick={() => setSelectedMeal(meal.value)}
              >
                <span>{meal.label}</span>
                <small>{selectedDay?.items.filter((item) => item.meal_type === meal.value).length ?? 0} 道</small>
              </button>
            ))}
          </div>

          <div className="weekly-meal-heading">
            <div>
              <h3>{selectedMealInfo?.label}</h3>
              <p>{selectedMealInfo?.hint} · 每道菜可单独设置人数</p>
            </div>
            <span className="chip chip-accent">{mealItems.length} 道菜</span>
          </div>

          {loadingWeek ? (
            <div className="weekly-inline-loading" aria-busy="true">正在加载本周安排...</div>
          ) : mealItems.length ? (
            <div className="weekly-item-list">
              {mealItems.map((item) => (
                <article key={item.id} className="weekly-item-row">
                  <RecipeThumb
                    src={item.recipe.image_url}
                    title={item.recipe.title}
                    category={item.recipe.category}
                    className="h-20 w-24 shrink-0 aspect-[5/4]"
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={`/recipes/${item.recipe.id}`} className="weekly-item-title text-clamp-2">{item.recipe.title}</Link>
                    <p className="mt-1 text-xs text-stone-500">
                      {item.recipe.category}{item.recipe.cooking_time ? ` · ${item.recipe.cooking_time} 分钟` : ""} · 默认 {item.recipe.default_servings} 人份
                    </p>
                    <div className="weekly-serving-control" aria-label={`${item.recipe.title}人数`}>
                      <span>计划人数</span>
                      <button type="button" className="weekly-stepper-button" onClick={() => void handleChangeServings(item, -1)} disabled={savingItemId === item.id || item.servings <= 1} aria-label="减少人数" title="减少人数">
                        <MinusIcon className="h-3.5 w-3.5" />
                      </button>
                      <strong>{item.servings}</strong>
                      <button type="button" className="weekly-stepper-button" onClick={() => void handleChangeServings(item, 1)} disabled={savingItemId === item.id || item.servings >= 20} aria-label="增加人数" title="增加人数">
                        <PlusIcon className="h-3.5 w-3.5" />
                      </button>
                      <span>人</span>
                    </div>
                  </div>
                  <button type="button" className="weekly-delete-button" onClick={() => void handleDeleteItem(item)} disabled={deletingItemId === item.id} aria-label={`移除${item.recipe.title}`} title="移除菜谱">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state weekly-empty-state">
              <p>这顿还没有安排菜谱。</p>
              <span>从右侧选择一道菜，马上加入计划。</span>
            </div>
          )}
        </section>

        <section className="section-card weekly-add-panel">
          <div className="section-head">
            <div>
              <h2 className="section-title">添加到{selectedMealInfo?.label}</h2>
              <p className="section-description">{formatDate(selectedDate)} 的{selectedMealInfo?.label}安排</p>
            </div>
            <span className="chip chip-neutral">不影响今日采购清单</span>
          </div>

          {recipes.length === 0 ? (
            <div className="empty-state mt-4">
              <p>还没有可选菜谱。</p>
              <Link href="/recipes/manual" className="button-primary button-sm mt-3">手动录入菜谱</Link>
            </div>
          ) : availableRecipes.length === 0 ? (
            <div className="empty-state mt-4">这个餐次已经安排了当前全部菜谱。</div>
          ) : (
            <div className="weekly-add-form">
              <label>
                <span className="label">选择菜谱</span>
                <select className="select" value={selectedRecipeId} onChange={(event) => setSelectedRecipeId(event.target.value)} disabled={saving}>
                  {availableRecipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title} · {recipe.category}</option>)}
                </select>
              </label>
              <label>
                <span className="label">计划人数</span>
                <input className="field" type="number" min={1} max={20} value={servings} onChange={(event) => setServings(Math.min(20, Math.max(1, Number(event.target.value) || 1)))} disabled={saving} />
              </label>
              <button type="button" className="button-primary w-full" onClick={() => void handleAddItem()} disabled={saving || !selectedRecipeId}>
                <PlusIcon className="mr-2 h-4 w-4" />{saving ? "添加中..." : `添加到${selectedMealInfo?.label}`}
              </button>
            </div>
          )}

          <div className="weekly-add-note">
            <p className="text-sm font-semibold text-stone-900">安排方式</p>
            <p className="mt-1 text-xs leading-5 text-stone-500">先选日期，再选早餐、午餐或晚餐。每道菜的人数可以单独调整。</p>
          </div>
        </section>
      </div>
    </section>
  );
}
