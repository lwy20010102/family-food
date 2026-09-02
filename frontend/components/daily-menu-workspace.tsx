"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { RecipeThumb } from "@/components/recipe-thumb";
import { UserAvatar } from "@/components/user-avatar";
import { ShoppingListPanel } from "@/components/shopping-list-panel";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/services/auth";
import { getCurrentFamily } from "@/services/family";
import {
  getTodayMenu,
  restoreTodayMenuVersion,
  saveTodayMenuFeedback,
  saveTodayMenuView,
  saveTodayMenu,
  updateTodayMenuItemStatus,
} from "@/services/daily-menus";
import type { User } from "@/types/auth";
import type {
  DailyMenu,
  DailyMenuFeedback,
  DailyMenuFeedbackPreference,
  DailyMenuItemStatus,
  DailyMenuView,
  DailyMenuVersion,
} from "@/types/daily-menu";
import type { DishOrder } from "@/types/dish-order";
import type { FamilyMember, FamilyPublic } from "@/types/family";

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
  confirmed: "已发布",
} satisfies Record<DailyMenu["status"], string>;

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const syncTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
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

function menuVersionKey(menu: DailyMenu | null) {
  if (!menu) {
    return "none";
  }

  return [
    menu.id,
    menu.updated_at,
    menu.servings,
    menu.meal_time,
    ...menu.items.map((item) => `${item.id}:${item.recipe_id}:${item.status}:${item.sort_order}`),
  ].join("|");
}

function formatRelativeViewTime(value: string) {
  const viewedAt = new Date(value).getTime();
  if (!Number.isFinite(viewedAt)) {
    return "较早";
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - viewedAt) / 1000));
  if (elapsedSeconds < 60) {
    return "刚刚";
  }
  if (elapsedSeconds < 60 * 60) {
    return `${Math.floor(elapsedSeconds / 60)} 分钟前`;
  }
  if (elapsedSeconds < 24 * 60 * 60) {
    return `${Math.floor(elapsedSeconds / (60 * 60))} 小时前`;
  }

  return dateTimeFormatter.format(new Date(value));
}

type FeedbackSummary = {
  wantCount: number;
  avoidCount: number;
  wantNames: string[];
  avoidNames: string[];
};

function buildFeedbackSummaries(feedbacks: DailyMenuFeedback[]) {
  const summaries = new Map<number, FeedbackSummary>();

  for (const feedback of feedbacks) {
    const current = summaries.get(feedback.recipe_id) ?? {
      wantCount: 0,
      avoidCount: 0,
      wantNames: [],
      avoidNames: [],
    };
    const names = feedback.preference === "want" ? current.wantNames : current.avoidNames;

    if (feedback.preference === "want") {
      current.wantCount += 1;
    } else {
      current.avoidCount += 1;
    }
    if (!names.includes(feedback.user.username)) {
      names.push(feedback.user.username);
    }
    summaries.set(feedback.recipe_id, current);
  }

  return summaries;
}

function buildMyFeedbackMap(
  feedbacks: DailyMenuFeedback[],
  userId: number | undefined,
) {
  const preferences = new Map<number, DailyMenuFeedbackPreference>();
  if (!userId) {
    return preferences;
  }

  for (const feedback of feedbacks) {
    if (feedback.user_id === userId) {
      preferences.set(feedback.recipe_id, feedback.preference);
    }
  }
  return preferences;
}

function MenuFeedbackBar({
  recipeTitle,
  summary,
  myPreference,
  saving,
  showNames,
  onSelect,
}: {
  recipeTitle: string;
  summary: FeedbackSummary;
  myPreference: DailyMenuFeedbackPreference | null;
  saving: boolean;
  showNames: boolean;
  onSelect: (preference: DailyMenuFeedbackPreference) => void;
}) {
  const [open, setOpen] = useState(Boolean(myPreference));
  const total = summary.wantCount + summary.avoidCount;
  const summaryText = total
    ? `已有 ${total} 位家人反馈`
    : "还没有家人反馈";

  return (
    <div className="daily-feedback-bar" aria-busy={saving}>
      <div className="daily-feedback-summary">
        <span className="daily-feedback-label">家人偏好</span>
        <span
          className="daily-feedback-count daily-feedback-count-want"
          title={showNames && summary.wantNames.length ? `${summary.wantNames.join("、")} 想吃` : undefined}
        >
          想吃 {summary.wantCount}
        </span>
        <span
          className="daily-feedback-count daily-feedback-count-avoid"
          title={showNames && summary.avoidNames.length ? `${summary.avoidNames.join("、")} 不想吃` : undefined}
        >
          不想吃 {summary.avoidCount}
        </span>
        <span className="daily-feedback-total">
          {saving ? "正在保存反馈…" : summaryText}
        </span>
        <button
          type="button"
          className="daily-feedback-toggle"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "收起" : myPreference ? "已反馈" : "表达偏好"}
        </button>
      </div>
      {open ? (
        <div className="daily-feedback-actions" role="group" aria-label={`对${recipeTitle}表达偏好`}>
          <button
            type="button"
            className={`daily-feedback-button daily-feedback-button-want ${myPreference === "want" ? "is-active" : ""}`}
            aria-pressed={myPreference === "want"}
            disabled={saving}
            onClick={() => onSelect("want")}
          >
            我想吃
          </button>
          <button
            type="button"
            className={`daily-feedback-button daily-feedback-button-avoid ${myPreference === "avoid" ? "is-active" : ""}`}
            aria-pressed={myPreference === "avoid"}
            disabled={saving}
            onClick={() => onSelect("avoid")}
          >
            不想吃
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SharedMenuCard({
  menu,
  mealTime,
  members,
  menuViews,
  currentUserId,
  savingView,
  onToggleView,
  showFeedback,
  showViewNames,
  feedbackSummaries,
  myFeedback,
  savingFeedbackRecipeId,
  onFeedback,
}: {
  menu: DailyMenu | null;
  mealTime: string;
  members: FamilyMember[];
  menuViews: DailyMenuView[];
  currentUserId: number | undefined;
  savingView: boolean;
  onToggleView: () => void;
  showFeedback: boolean;
  showViewNames: boolean;
  feedbackSummaries: Map<number, FeedbackSummary>;
  myFeedback: Map<number, DailyMenuFeedbackPreference>;
  savingFeedbackRecipeId: number | null;
  onFeedback: (recipeId: number, preference: DailyMenuFeedbackPreference) => void;
}) {
  const viewedUserIds = new Set(menuViews.map((view) => view.user_id));
  const viewByUserId = new Map(menuViews.map((view) => [view.user_id, view]));
  const viewedMembers = members.filter((member) => viewedUserIds.has(member.user.id));
  const unviewedMembers = members.filter((member) => !viewedUserIds.has(member.user.id));
  const viewedMemberLabels = viewedMembers.map((member) => {
    const view = viewByUserId.get(member.user.id);
    return view
      ? `${member.user.username}（${formatRelativeViewTime(view.viewed_at)}）`
      : member.user.username;
  });
  const isViewedByCurrentUser = currentUserId !== undefined && viewedUserIds.has(currentUserId);
  const isPublished = menu?.status === "confirmed";

  return (
    <section className="daily-shared-menu-card" aria-labelledby="shared-menu-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">家庭共享</p>
          <h2 id="shared-menu-title" className="mt-1 text-xl font-semibold tracking-tight text-stone-900">
            {menu?.status === "confirmed" ? "今晚菜单已发布" : "发布后全家都能看到"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-emerald-900/75">
            {menu?.status === "confirmed"
              ? `预计 ${menu.meal_time} 开饭 · ${menu.servings} 人份`
              : `预计 ${mealTime} 开饭 · 选好菜后点击确认并发布`}
          </p>
        </div>
        <span className="chip chip-accent">{isPublished ? "家庭可见" : "待发布"}</span>
      </div>

      {isPublished && members.length ? (
        <div className="daily-menu-view-summary" aria-live="polite">
          <div className="daily-menu-view-summary-copy">
            <span className="daily-menu-view-summary-title">
              {viewedMembers.length}/{members.length} 位家人已查看
            </span>
            {showViewNames && viewedMembers.length ? (
              <span suppressHydrationWarning>已看：{viewedMemberLabels.join("、")}</span>
            ) : null}
            {showViewNames && unviewedMembers.length ? (
              <span className="daily-menu-view-summary-muted">
                未看：{unviewedMembers.map((member) => member.user.username).join("、")}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className={`daily-menu-view-button ${isViewedByCurrentUser ? "is-viewed" : ""}`}
            aria-pressed={isViewedByCurrentUser}
            disabled={savingView}
            onClick={onToggleView}
          >
            {savingView ? "保存中..." : isViewedByCurrentUser ? "标记未看" : "我已看"}
          </button>
        </div>
      ) : null}

      {menu?.items.length ? (
        <div className="daily-shared-menu-items">
          {menu.items.map((item) => {
            const feedbackSummary = feedbackSummaries.get(item.recipe_id) ?? {
              wantCount: 0,
              avoidCount: 0,
              wantNames: [],
              avoidNames: [],
            };

            return (
              <div key={item.id} className="daily-shared-menu-item-stack">
                <Link href={`/recipes/${item.recipe.id}`} className="daily-shared-menu-item">
                  <RecipeThumb
                    src={item.recipe.image_url}
                    title={item.recipe.title}
                    category={item.recipe.category}
                    className="h-14 w-20 shrink-0 rounded-[10px]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block line-clamp-2 break-words text-sm font-semibold text-stone-900">{item.recipe.title}</span>
                    <span className="mt-1 block text-xs text-stone-500">{item.recipe.category}</span>
                  </span>
                </Link>
                {showFeedback ? (
                  <MenuFeedbackBar
                    recipeTitle={item.recipe.title}
                    summary={feedbackSummary}
                    myPreference={myFeedback.get(item.recipe_id) ?? null}
                    saving={savingFeedbackRecipeId === item.recipe_id}
                    showNames={showViewNames}
                    onSelect={(preference) => onFeedback(item.recipe_id, preference)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="daily-shared-menu-empty">
          <p className="text-sm font-medium text-emerald-950">还没有已发布的菜品</p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">右侧选好候选菜后，点击确认并发布，家人就能看到。</p>
        </div>
      )}
    </section>
  );
}

export function DailyMenuWorkspace() {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [family, setFamily] = useState<FamilyPublic | null | undefined>(undefined);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [menu, setMenu] = useState<DailyMenu | null>(null);
  const [orders, setOrders] = useState<DishOrder[]>([]);
  const [feedbacks, setFeedbacks] = useState<DailyMenuFeedback[]>([]);
  const [menuViews, setMenuViews] = useState<DailyMenuView[]>([]);
  const [menuVersions, setMenuVersions] = useState<DailyMenuVersion[]>([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<number[]>([]);
  const [servings, setServings] = useState(2);
  const [mealTime, setMealTime] = useState("18:30");
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [savingFeedbackRecipeId, setSavingFeedbackRecipeId] = useState<number | null>(null);
  const [savingView, setSavingView] = useState(false);
  const [syncingMenu, setSyncingMenu] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [statusDraftDirty, setStatusDraftDirty] = useState(false);
  const [pendingMenu, setPendingMenu] = useState<DailyMenu | null>(null);
  const [pendingMenuViews, setPendingMenuViews] = useState<DailyMenuView[]>([]);
  const [menuConflict, setMenuConflict] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<number | null>(null);
  const [restoreVersionId, setRestoreVersionId] = useState<number | null>(null);
  const menuRefreshInFlight = useRef(false);
  const menuRef = useRef<DailyMenu | null>(null);
  const pendingMenuRef = useRef<DailyMenu | null>(null);
  const hasUnsavedChangesRef = useRef(false);
  const dismissedMenuVersionRef = useRef<string | null>(null);
  const autoViewedMenuKeyRef = useRef<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<
    Record<number, DailyMenuItemStatus>
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasUnsavedChanges = draftDirty || statusDraftDirty;
  const canEdit = Boolean(
    currentUser &&
      family !== undefined &&
      (!family || family.creator_id === currentUser.id),
  );

  useEffect(() => {
    menuRef.current = menu;
  }, [menu]);

  useEffect(() => {
    pendingMenuRef.current = pendingMenu;
  }, [pendingMenu]);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

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
          setFamilyMembers([]);
          return;
        }

        const familyResponse = await getCurrentFamily();
        if (!active) {
          return;
        }

        setFamily(familyResponse.family);
        setFamilyMembers(familyResponse.members);
        setCurrentUser(user);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof ApiError ? err.message : "加载登录状态失败");
        setCurrentUser(null);
        setFamily(null);
        setFamilyMembers([]);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const loadMenuData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!currentUser || menuRefreshInFlight.current) {
        return;
      }

      menuRefreshInFlight.current = true;
      if (silent) {
        setSyncingMenu(true);
      } else {
        setLoadingMenu(true);
        setError(null);
        setMessage(null);
      }

      try {
        const response = await getTodayMenu();
        const incomingMenu = response.menu;
        const menuChanged = menuVersionKey(menuRef.current) !== menuVersionKey(incomingMenu);
        setOrders(response.orders);
        setFeedbacks(response.feedbacks ?? []);
        setMenuVersions(response.menu_versions ?? []);
        if (hasUnsavedChangesRef.current) {
          if (
            menuChanged &&
            menuVersionKey(pendingMenuRef.current) !== menuVersionKey(incomingMenu) &&
            dismissedMenuVersionRef.current !== menuVersionKey(incomingMenu)
          ) {
            setPendingMenu(incomingMenu);
            setPendingMenuViews(response.menu_views ?? []);
            setMenuConflict(true);
          } else if (!menuChanged) {
            setMenuViews(response.menu_views ?? []);
          }
        } else {
          setMenuViews(response.menu_views ?? []);
          setMenu(incomingMenu);
          setSelectedRecipeIds(buildSelectedRecipeIds(response.orders, response.menu));
          setServings(response.menu?.servings ?? 2);
          setMealTime(response.menu?.meal_time ?? "18:30");
          setPendingMenu(null);
          setPendingMenuViews([]);
          setMenuConflict(false);
          dismissedMenuVersionRef.current = null;
        }
        setLastSyncedAt(new Date());
        setSyncError(null);
      } catch (err) {
        if (silent) {
          setSyncError("同步失败，点击刷新重试");
        } else {
          setError(err instanceof ApiError ? err.message : "加载今日菜单失败，请重试");
        }
      } finally {
        menuRefreshInFlight.current = false;
        if (silent) {
          setSyncingMenu(false);
        } else {
          setLoadingMenu(false);
        }
      }
    },
    [currentUser],
  );

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    void loadMenuData();
    const refreshTimer = window.setInterval(() => {
      void loadMenuData({ silent: true });
    }, 20_000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [currentUser, loadMenuData]);

  useEffect(() => {
    if (
      !currentUser ||
      !family ||
      canEdit ||
      !menu ||
      menu.status !== "confirmed" ||
      loadingMenu
    ) {
      return;
    }

    const currentMenuKey = menuVersionKey(menu);
    if (
      autoViewedMenuKeyRef.current === currentMenuKey ||
      menuViews.some((view) => view.user_id === currentUser.id)
    ) {
      return;
    }

    autoViewedMenuKeyRef.current = currentMenuKey;
    void saveTodayMenuView(true)
      .then((updated) => {
        if (!updated) {
          autoViewedMenuKeyRef.current = null;
          return;
        }

        setMenuViews((current) => {
          const withoutMine = current.filter((view) => view.user_id !== currentUser.id);
          return [...withoutMine, updated];
        });
      })
      .catch(() => {
        autoViewedMenuKeyRef.current = null;
        setSyncError("菜单已加载，但查看状态同步失败，点击刷新重试");
      });
  }, [canEdit, currentUser, family, loadingMenu, menu, menuViews]);

  useEffect(() => {
    setStatusDrafts(buildStatusDrafts(menu));
  }, [menu]);

  const groupedOrders = useMemo(() => groupOrders(orders), [orders]);
  const candidateRecipes = useMemo(
    () => buildCandidateRecipes(orders, menu),
    [menu, orders],
  );

  const selectedRecipeCount = selectedRecipeIds.length;
  const candidateRecipeIds = candidateRecipes.map((candidate) => candidate.recipe.id);
  const feedbackSummaries = useMemo(() => buildFeedbackSummaries(feedbacks), [feedbacks]);
  const myFeedback = useMemo(
    () => buildMyFeedbackMap(feedbacks, currentUser?.id),
    [currentUser?.id, feedbacks],
  );
  function toggleRecipe(recipeId: number) {
    if (!canEdit) {
      return;
    }

    setMessage(null);
    setError(null);
    setDraftDirty(true);
    setSelectedRecipeIds((current) =>
      current.includes(recipeId)
        ? current.filter((item) => item !== recipeId)
        : [...current, recipeId],
    );
  }

  async function handleFeedback(
    recipeId: number,
    preference: DailyMenuFeedbackPreference,
  ) {
    if (!family || !currentUser || savingFeedbackRecipeId === recipeId) {
      return;
    }

    const nextPreference = myFeedback.get(recipeId) === preference ? "none" : preference;
    setSavingFeedbackRecipeId(recipeId);
    setError(null);
    setMessage(null);

    try {
      const updated = await saveTodayMenuFeedback(recipeId, nextPreference);
      setFeedbacks((current) => {
        const withoutMine = current.filter(
          (feedback) =>
            !(feedback.user_id === currentUser.id && feedback.recipe_id === recipeId),
        );
        return updated ? [...withoutMine, updated] : withoutMine;
      });
      setMessage(
        nextPreference === "none"
          ? "已取消这道菜的反馈"
          : nextPreference === "want"
            ? "已告诉家人你想吃这道菜"
            : "已告诉家人你不想吃这道菜",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "保存反馈失败，请重试");
    } finally {
      setSavingFeedbackRecipeId(null);
    }
  }

  async function handleToggleView() {
    if (!family || !currentUser || !menu || menu.status !== "confirmed" || savingView) {
      return;
    }

    const currentlyViewed = menuViews.some((view) => view.user_id === currentUser.id);
    setSavingView(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await saveTodayMenuView(!currentlyViewed);
      setMenuViews((current) => {
        const withoutMine = current.filter((view) => view.user_id !== currentUser.id);
        return updated ? [...withoutMine, updated] : withoutMine;
      });
      setMessage(updated ? "已同步给家人：你已经看过今晚菜单" : "已标记为未看");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "同步查看状态失败，请重试");
    } finally {
      setSavingView(false);
    }
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
        meal_time: mealTime,
      });
      setMenu(nextMenu);
      menuRef.current = nextMenu;
      // Publishing a new version resets acknowledgements for every member.
      setMenuViews(
        currentUser
          ? [
              {
                id: -Date.now(),
                daily_menu_id: nextMenu.id,
                family_id: nextMenu.family_id,
                user_id: currentUser.id,
                viewed_at: new Date().toISOString(),
                user: currentUser,
              },
            ]
          : [],
      );
      setSelectedRecipeIds(nextMenu.items.map((item) => item.recipe_id));
      setServings(nextMenu.servings);
      setMealTime(nextMenu.meal_time);
      setDraftDirty(false);
      setStatusDraftDirty(false);
      hasUnsavedChangesRef.current = false;
      setPendingMenu(null);
      setPendingMenuViews([]);
      setMenuConflict(false);
      dismissedMenuVersionRef.current = null;
      setMessage("今日菜单已确认");
      void loadMenuData({ silent: true });
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
      const nextMenu = menu
        ? {
            ...menu,
            items: menu.items.map((item) =>
              item.id === updated.id ? updated : item,
            ),
          }
        : null;
      const nextStatusDrafts = { ...statusDrafts, [updated.id]: updated.status };
      setMenu(nextMenu);
      menuRef.current = nextMenu;
      setStatusDrafts(nextStatusDrafts);
      setStatusDraftDirty(
        Boolean(
          nextMenu?.items.some(
            (item) => nextStatusDrafts[item.id] && nextStatusDrafts[item.id] !== item.status,
          ),
        ),
      );
      setMessage("菜品状态已更新");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "更新菜品状态失败，请重试");
    } finally {
      setSavingItemId(null);
    }
  }

  async function handleRestoreVersion(versionId: number) {
    if (!canEdit || restoringVersionId !== null) {
      return;
    }

    setRestoringVersionId(versionId);
    setError(null);
    setMessage(null);
    try {
      await restoreTodayMenuVersion(versionId);
      setRestoreVersionId(null);
      setDraftDirty(false);
      setStatusDraftDirty(false);
      hasUnsavedChangesRef.current = false;
      await loadMenuData();
      setMessage("已恢复这份菜单版本并重新发布");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "恢复菜单版本失败，请重试");
    } finally {
      setRestoringVersionId(null);
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
              {family && !canEdit
                ? "查看今晚菜单，告诉家人你想吃什么。"
                : "你来安排今晚菜单，发布后家庭成员可以直接查看。"}
            </p>
          </div>
          <div className="daily-menu-context flex flex-wrap gap-2">
            <span className="chip chip-accent">
              {family ? `当前家庭 · ${family.name}` : "个人空间"}
            </span>
            <span className="chip chip-neutral">
              {menu ? menuStateLabels[menu.status] : "未确认"}
            </span>
            <span className="chip chip-neutral">
              {family && !canEdit
                ? `今晚已发布 ${menu?.items.length ?? 0} 道`
                : `已选 ${selectedRecipeCount} 道`}
            </span>
          </div>
        </div>
        <div className="daily-menu-sync-row" aria-live="polite">
          <span className={syncError ? "daily-menu-sync-status is-error" : "daily-menu-sync-status"}>
            {syncError
              ? `${syncError}${lastSyncedAt ? ` · 上次成功同步 ${syncTimeFormatter.format(lastSyncedAt)}` : ""}`
              : syncingMenu
                ? "正在同步家庭菜单…"
                : hasUnsavedChanges
                  ? "有未保存修改，已暂停自动覆盖"
                : lastSyncedAt
                  ? `最近同步 ${syncTimeFormatter.format(lastSyncedAt)}`
                  : "等待同步"}
          </span>
          <button
            type="button"
            className="daily-menu-sync-button"
            onClick={() => void loadMenuData({ silent: true })}
            disabled={syncingMenu || loadingMenu}
          >
            刷新
          </button>
        </div>

        {menuConflict && pendingMenu ? (
          <div className="daily-menu-conflict" role="alert">
            <div className="min-w-0">
              <p className="font-semibold text-amber-950">家庭菜单有新版本</p>
              <p className="mt-1 text-xs leading-5 text-amber-900/80">
                其他设备刚刚更新了菜单。你可以载入新版本，或保留当前修改后手动发布。
              </p>
            </div>
            <div className="daily-menu-conflict-actions">
              <button
                type="button"
                className="button-secondary button-sm"
                onClick={() => {
                  setMenu(pendingMenu);
                  menuRef.current = pendingMenu;
                  setMenuViews(pendingMenuViews);
                  setSelectedRecipeIds(pendingMenu.items.map((item) => item.recipe_id));
                  setServings(pendingMenu.servings);
                  setMealTime(pendingMenu.meal_time);
                  setDraftDirty(false);
                  setStatusDraftDirty(false);
                  hasUnsavedChangesRef.current = false;
                  setPendingMenu(null);
                  setPendingMenuViews([]);
                  setMenuConflict(false);
                  dismissedMenuVersionRef.current = null;
                  setMessage("已载入家庭最新菜单");
                }}
              >
                载入新版本
              </button>
              <button
                type="button"
                className="button-ghost button-sm"
                onClick={() => {
                  dismissedMenuVersionRef.current = menuVersionKey(pendingMenu);
                  setPendingMenu(null);
                  setPendingMenuViews([]);
                  setMenuConflict(false);
                  setMessage("已保留当前修改，发布前不会自动覆盖");
                }}
              >
                保留我的修改
              </button>
            </div>
          </div>
        ) : null}
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
        <div className={`section-card daily-orders-panel ${!canEdit && family ? "daily-member-panel" : ""}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h2 className="section-title">{family ? "家庭候选菜" : "我的候选菜"}</h2>
                <p className="section-description">
                  从候选菜中勾选今晚要做的菜，再一次发布给家人。
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
          <SharedMenuCard
            menu={menu}
            mealTime={mealTime}
            members={familyMembers}
            menuViews={menuViews}
            currentUserId={currentUser?.id}
            savingView={savingView}
            onToggleView={() => void handleToggleView()}
            showFeedback={Boolean(family && !canEdit)}
            showViewNames={canEdit}
            feedbackSummaries={feedbackSummaries}
            myFeedback={myFeedback}
            savingFeedbackRecipeId={savingFeedbackRecipeId}
            onFeedback={(recipeId, preference) => void handleFeedback(recipeId, preference)}
          />

          <section className={`section-card daily-confirm-panel ${!canEdit && family ? "daily-member-panel" : ""}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="section-title">安排今晚菜单</h2>
                <p className="section-description">
                  选择今天要做的菜，并设置今天吃几个人份。
                </p>
              </div>
              <div className="chip chip-neutral">已选 {selectedRecipeCount} 道</div>
            </div>

            {canEdit || !family ? <label className="mt-4 block">
              <span className="label">今天几个人吃</span>
              <input
                type="number"
                min={1}
                max={20}
                value={servings}
                onChange={(event) => {
                  setServings(Number(event.target.value) || 1);
                  setDraftDirty(true);
                }}
                disabled={!canEdit}
                className="field"
              />
            </label> : null}

            {canEdit || !family ? <label className="mt-4 block">
              <span className="label">预计开饭时间</span>
              <input
                type="time"
                value={mealTime}
                onChange={(event) => {
                  setMealTime(event.target.value);
                  setDraftDirty(true);
                }}
                disabled={!canEdit}
                className="field"
              />
              <span className="mt-1 block text-xs leading-5 text-stone-500">
                发布后家庭成员会在共享菜单上看到这个时间。
              </span>
            </label> : null}

            {canEdit && candidateRecipes.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="button-secondary button-sm"
                  onClick={() => {
                    setSelectedRecipeIds(candidateRecipeIds);
                    setDraftDirty(true);
                  }}
                  disabled={!canEdit || savingMenu}
                >
                  全选候选菜
                </button>
                <button
                  type="button"
                  className="button-ghost button-sm"
                  onClick={() => {
                    setSelectedRecipeIds([]);
                    setDraftDirty(true);
                  }}
                  disabled={!canEdit || savingMenu || selectedRecipeCount === 0}
                >
                  清空已选
                </button>
              </div>
            ) : null}

            {canEdit || !family ? <div className="mt-4 space-y-3">
              {candidateRecipes.length === 0 ? (
                <div className="empty-state">还没有点菜，先去点菜页选几道菜。</div>
              ) : (
                candidateRecipes.map((candidate) => {
                  const selected = selectedRecipeIds.includes(candidate.recipe.id);

                  const feedbackSummary = feedbackSummaries.get(candidate.recipe.id) ?? {
                    wantCount: 0,
                    avoidCount: 0,
                    wantNames: [],
                    avoidNames: [],
                  };

                  return (
                    <div key={candidate.recipe.id} className="daily-candidate-stack">
                      <label
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

                      {family ? (
                        <MenuFeedbackBar
                          recipeTitle={candidate.recipe.title}
                          summary={feedbackSummary}
                          myPreference={myFeedback.get(candidate.recipe.id) ?? null}
                          saving={savingFeedbackRecipeId === candidate.recipe.id}
                          showNames={canEdit}
                          onSelect={(preference) =>
                            void handleFeedback(candidate.recipe.id, preference)
                          }
                        />
                      ) : null}
                    </div>
                  );
                })
              )}
            </div> : null}

            {canEdit || !family ? <div className="daily-menu-confirm-action">
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
                    ? "更新并发布"
                    : "确认并发布"}
              </button>
            </div> : null}

            {!canEdit ? (
              <p className="mt-3 text-xs leading-5 text-stone-500">
                {family ? "只有家庭创建者可以确认最终菜单。" : "个人空间可以直接确认今日菜单。"}
              </p>
            ) : null}
          </section>

          <ShoppingListPanel menu={menu} />

          <section className={`section-card daily-status-panel ${!canEdit && family ? "daily-member-panel" : ""}`}>
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
                        onChange={(event) => {
                          setStatusDrafts((current) => ({
                            ...current,
                            [item.id]: event.target.value as DailyMenuItemStatus,
                          }));
                          setStatusDraftDirty(true);
                        }}
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

          {canEdit && menuVersions.length ? (
            <section className="section-card daily-history-panel">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="section-title">最近发布版本</h2>
                  <p className="section-description">误改菜单时，可以恢复最近 5 次发布记录。</p>
                </div>
                <span className="chip chip-neutral">保留 {menuVersions.length} 版</span>
              </div>
              <div className="mt-4 space-y-2">
                {menuVersions.map((version) => (
                  <div key={version.id} className="daily-history-row">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-900">
                        第 {version.version_number} 版 · {version.recipe_titles.join("、")}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {version.confirmed_by?.username ?? "家庭成员"} · {version.meal_time} 开饭 · {version.servings} 人份
                      </p>
                    </div>
                    {restoreVersionId === version.id ? (
                      <div className="daily-history-confirm">
                        <span className="text-xs text-amber-900">恢复后会重新发布并通知家人</span>
                        <button
                          type="button"
                          className="button-primary button-sm"
                          disabled={restoringVersionId === version.id}
                          onClick={() => void handleRestoreVersion(version.id)}
                        >
                          {restoringVersionId === version.id ? "恢复中..." : "确认恢复"}
                        </button>
                        <button
                          type="button"
                          className="button-ghost button-sm"
                          onClick={() => setRestoreVersionId(null)}
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="button-secondary button-sm shrink-0"
                        onClick={() => setRestoreVersionId(version.id)}
                        disabled={restoringVersionId !== null}
                      >
                        恢复此版
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

        </div>
      </div>
    </section>
  );
}
