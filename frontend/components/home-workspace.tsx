"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowRightIcon,
  MenuIcon,
  NotificationsIcon,
  OrdersIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  ShoppingListIcon,
} from "@/components/icons";
import { ApiError } from "@/lib/api";
import { RecipeThumb } from "@/components/recipe-thumb";
import { UserAvatar } from "@/components/user-avatar";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getCurrentUser } from "@/services/auth";
import { getTodayMenu, publishTodayMenu } from "@/services/daily-menus";
import { getTodayDishOrders } from "@/services/dish-orders";
import { getCurrentFamily } from "@/services/family";
import { getNotifications } from "@/services/notifications";
import { getRecipes } from "@/services/recipes";
import { getTodayShoppingList } from "@/services/shopping-lists";
import type { User } from "@/types/auth";
import type { DailyMenu } from "@/types/daily-menu";
import type { DishOrder } from "@/types/dish-order";
import type { FamilyMember, FamilyPublic } from "@/types/family";
import type { Notification } from "@/types/notification";
import type { RecipeSummary } from "@/types/recipe";
import type { ShoppingList } from "@/types/shopping-list";

type HomeData = {
  family: FamilyPublic | null;
  members: FamilyMember[];
  menu: DailyMenu | null;
  orders: DishOrder[];
  recipes: RecipeSummary[];
  notifications: Notification[];
  unreadCount: number;
  shoppingList: ShoppingList | null;
};

type HomeSection = "family" | "menu" | "orders" | "recipes" | "notifications" | "shopping";
type HomeSectionErrors = Partial<Record<HomeSection, string>>;

const emptyHomeData: HomeData = {
  family: null,
  members: [],
  menu: null,
  orders: [],
  recipes: [],
  notifications: [],
  unreadCount: 0,
  shoppingList: null,
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  weekday: "long",
});

const homeSyncTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
});

function groupOrders(orders: DishOrder[]) {
  const groups = new Map<number, { user: User; orders: DishOrder[] }>();

  for (const order of orders) {
    const current = groups.get(order.user.id);
    if (current) {
      current.orders.push(order);
    } else {
      groups.set(order.user.id, { user: order.user, orders: [order] });
    }
  }

  return Array.from(groups.values());
}

function getMenuState(menu: DailyMenu | null) {
  if (!menu) {
    return "还没有确认";
  }

  return menu.status === "confirmed" ? "已发布" : "待确认";
}

function isMeatRecipe(recipe: RecipeSummary) {
  return recipe.category === "肉类" || recipe.category === "海鲜";
}

function isVegetableRecipe(recipe: RecipeSummary) {
  return recipe.category === "蔬菜";
}

function buildBalancedRecommendations(
  recipes: RecipeSummary[],
  page: number,
) {
  if (!recipes.length) {
    return [];
  }

  const meatRecipes = recipes.filter(isMeatRecipe);
  const vegetableRecipes = recipes.filter(isVegetableRecipe);

  // Keep the main pairing stable while rotating through each category.
  if (meatRecipes.length && vegetableRecipes.length) {
    const selected = [
      meatRecipes[page % meatRecipes.length],
      vegetableRecipes[page % vegetableRecipes.length],
    ];
    const selectedIds = new Set(selected.map((recipe) => recipe.id));
    const supportingRecipes = recipes.filter(
      (recipe) =>
        !selectedIds.has(recipe.id) &&
        (recipe.category === "汤" || recipe.category === "主食"),
    );
    const remainingRecipes = recipes.filter((recipe) => !selectedIds.has(recipe.id));
    const extraPool = supportingRecipes.length ? supportingRecipes : remainingRecipes;

    if (extraPool.length) {
      selected.push(extraPool[page % extraPool.length]);
    }

    return selected;
  }

  const start = (page * 3) % recipes.length;
  return Array.from({ length: Math.min(3, recipes.length) }, (_, index) =>
    recipes[(start + index) % recipes.length],
  );
}

export function HomeWorkspace() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [data, setData] = useState<HomeData>(emptyHomeData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<HomeSectionErrors>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastHomeSyncedAt, setLastHomeSyncedAt] = useState<Date | null>(null);
  const [tonightMode, setTonightMode] = useState<"recommend" | "custom">("recommend");
  const [recommendationPage, setRecommendationPage] = useState(0);
  const [tonightSelectedIds, setTonightSelectedIds] = useState<number[]>([]);
  const [tonightServings, setTonightServings] = useState(2);
  const [customSearch, setCustomSearch] = useState("");
  const [publishingTonight, setPublishingTonight] = useState(false);
  const [tonightMessage, setTonightMessage] = useState<string | null>(null);
  const [tonightError, setTonightError] = useState<string | null>(null);
  const homeDataRef = useRef(data);
  const homeRefreshInFlight = useRef(false);
  const lastMenuVersionRef = useRef<string | null>(null);

  useEffect(() => {
    homeDataRef.current = data;
  }, [data]);

  const loadHome = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (homeRefreshInFlight.current) {
      return;
    }

    homeRefreshInFlight.current = true;
    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser) {
        setData(emptyHomeData);
        setSectionErrors({});
        return;
      }

      const [familyResult, menuResult, ordersResult, recipesResult, notificationsResult, shoppingResult] =
        await Promise.allSettled([
          getCurrentFamily(),
          getTodayMenu(),
          getTodayDishOrders(),
          getRecipes(),
          getNotifications(),
          getTodayShoppingList(),
        ]);

      const previous = homeDataRef.current;
      const menuResponse = menuResult.status === "fulfilled" ? menuResult.value : null;
      const familyResponse = familyResult.status === "fulfilled" ? familyResult.value : null;
      const orders = ordersResult.status === "fulfilled" ? ordersResult.value : null;
      const recipes = recipesResult.status === "fulfilled" ? recipesResult.value : null;
      const notificationsResponse = notificationsResult.status === "fulfilled" ? notificationsResult.value : null;
      const shoppingResponse = shoppingResult.status === "fulfilled" ? shoppingResult.value : null;
      const nextSectionErrors: HomeSectionErrors = {};
      if (familyResult.status === "rejected") nextSectionErrors.family = "家庭信息加载失败";
      if (menuResult.status === "rejected") nextSectionErrors.menu = "今日菜单加载失败";
      if (ordersResult.status === "rejected") nextSectionErrors.orders = "点菜记录加载失败";
      if (recipesResult.status === "rejected") nextSectionErrors.recipes = "菜谱推荐加载失败";
      if (notificationsResult.status === "rejected") nextSectionErrors.notifications = "通知加载失败";
      if (shoppingResult.status === "rejected") nextSectionErrors.shopping = "采购清单加载失败";
      const successfulRequests = [
        familyResult,
        menuResult,
        ordersResult,
        recipesResult,
        notificationsResult,
        shoppingResult,
      ].filter((result) => result.status === "fulfilled").length;

      const nextOrders = orders
        ? orders.length
          ? orders
          : menuResponse?.orders ?? previous.orders
        : previous.orders;
      setData({
        family: familyResult.status === "fulfilled" ? familyResult.value.family : previous.family,
        members: familyResult.status === "fulfilled" ? familyResult.value.members : previous.members,
        menu: menuResult.status === "fulfilled" ? menuResult.value.menu : previous.menu,
        orders: nextOrders,
        recipes: recipes ?? previous.recipes,
        notifications: notificationsResponse?.notifications ?? previous.notifications,
        unreadCount: notificationsResponse?.unread_count ?? previous.unreadCount,
        shoppingList: shoppingResult.status === "fulfilled"
          ? shoppingResult.value.shopping_list
          : previous.shoppingList,
      });
      setSectionErrors(nextSectionErrors);

      if (successfulRequests === 0) {
        setError("首页数据加载失败，请点击重试。");
      } else if (!silent) {
        setError(null);
      }
      if (successfulRequests > 0) {
        setLastHomeSyncedAt(new Date());
      }
    } catch {
      setError("登录状态加载失败，请点击重试。");
    } finally {
      homeRefreshInFlight.current = false;
      if (silent) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const refreshTimer = window.setInterval(() => {
      void loadHome({ silent: true });
    }, 30_000);

    return () => window.clearInterval(refreshTimer);
  }, [user, loadHome]);

  useEffect(() => {
    const version = data.menu ? `${data.menu.id}:${data.menu.updated_at}` : "none";
    if (version === lastMenuVersionRef.current) {
      return;
    }
    lastMenuVersionRef.current = version;
    if (data.menu) {
      setTonightSelectedIds(data.menu.items.map((item) => item.recipe_id));
      setTonightServings(data.menu.servings);
    }
  }, [data.menu]);

  const groupedOrders = useMemo(() => groupOrders(data.orders), [data.orders]);
  const purchasedCount = data.shoppingList?.items.filter((item) => item.is_purchased).length ?? 0;
  const shoppingCount = data.shoppingList?.items.length ?? 0;
  const today = dateFormatter.format(new Date());
  const canPublishTonight = Boolean(
    user && (!data.family || data.family.creator_id === user.id),
  );
  const isFamilyMember = Boolean(
    user && data.family && data.family.creator_id !== user.id,
  );
  const currentFamilyMember = user
    ? data.members.find((member) => member.user.id === user.id)
    : undefined;
  const isCook = Boolean(data.family && currentFamilyMember?.meal_role === "cook");
  const showTodayMenuCard = !isFamilyMember && !isCook;
  const latestMenuNotice = data.notifications.find(
    (notification) =>
      notification.type.startsWith("daily_menu") && !notification.is_read,
  );
  const recommendationPool = useMemo(() => data.recipes, [data.recipes]);
  const tonightRecommendations = useMemo(
    () => buildBalancedRecommendations(recommendationPool, recommendationPage),
    [recommendationPage, recommendationPool],
  );
  const customRecipes = useMemo(() => {
    const keyword = customSearch.trim().toLocaleLowerCase("zh-CN");
    return data.recipes
      .filter((recipe) => !keyword || recipe.title.toLocaleLowerCase("zh-CN").includes(keyword))
      .slice(0, 8);
  }, [customSearch, data.recipes]);

  function toggleTonightRecipe(recipeId: number) {
    setTonightMessage(null);
    setTonightError(null);
    setTonightSelectedIds((current) =>
      current.includes(recipeId)
        ? current.filter((id) => id !== recipeId)
        : [...current, recipeId],
    );
  }

  async function publishTonightMenu() {
    if (!tonightSelectedIds.length) {
      setTonightError("先选择至少一道菜，再发布今晚菜单。");
      return;
    }

    setPublishingTonight(true);
    setTonightError(null);
    setTonightMessage(null);

    try {
      await publishTodayMenu({
        recipe_ids: tonightSelectedIds,
        servings: tonightServings,
        meal_time: data.menu?.meal_time ?? "18:30",
      });
      setTonightMessage("今晚菜单已发布，家庭成员现在可以查看。");
      await loadHome();
    } catch (err) {
      setTonightError(
        err instanceof ApiError
          ? err.message
          : "发布今晚菜单失败，请稍后重试。",
      );
    } finally {
      setPublishingTonight(false);
    }
  }

  const tonightDecisionCard = (
    <TonightDecisionCard
      mode={tonightMode}
      onModeChange={(mode) => {
        setTonightMode(mode);
        setTonightError(null);
        setTonightMessage(null);
      }}
      recommendationRecipes={tonightRecommendations}
      customRecipes={customRecipes}
      customSearch={customSearch}
      onCustomSearchChange={setCustomSearch}
      selectedRecipeIds={tonightSelectedIds}
      servings={tonightServings}
      onServingsChange={setTonightServings}
      onToggleRecipe={toggleTonightRecipe}
      onShuffle={() => {
        setRecommendationPage((current) => current + 1);
        setTonightError(null);
        setTonightMessage(null);
      }}
      onUseRecommendation={() => {
        setTonightSelectedIds(tonightRecommendations.map((recipe) => recipe.id));
        setTonightError(null);
        setTonightMessage(null);
      }}
      onPublish={publishTonightMenu}
      canPublish={canPublishTonight}
      publishing={publishingTonight}
      message={tonightMessage}
      error={tonightError}
      recipeError={sectionErrors.recipes}
      onRetryRecipes={() => void loadHome()}
      menu={data.menu}
    />
  );

  return (
    <WorkspaceShell
      title="今天吃什么好呢？"
      description={user ? `${user.username}，这是今天的家庭用餐安排。` : today}
      actions={[
        {
          href: "/notifications",
          label: data.unreadCount ? `通知，有 ${data.unreadCount} 条未读` : "通知",
          icon: <NotificationsIcon className="h-4 w-4" />,
          iconOnly: true,
          badge: data.unreadCount,
        },
        { href: "/recipes/manual", label: "录入菜谱", tone: "primary" },
      ]}
    >
      <div className="home-page">
        <section className="home-welcome" aria-label="日期和问候">
          <div>
            <p className="home-date">{today}</p>
            <p className="home-welcome-copy">
              {user ? "把今天的点菜、菜单和采购安排好，做饭就从容多了。" : "登录后即可查看你的今日用餐安排。"}
            </p>
          </div>
          <div className="home-welcome-actions">
            <Link href={isCook ? "/menu" : "/orders"} className="button-primary">
              {isCook ? <MenuIcon className="mr-2 h-4 w-4" /> : <OrdersIcon className="mr-2 h-4 w-4" />}
              {isCook ? "查看今天菜谱" : "快速点菜"}
            </Link>
            <Link href={isCook ? "/orders" : "/menu"} className="button-secondary">
              {isCook ? "查看家人点菜" : "查看今日菜单"}
            </Link>
          </div>
        </section>

        {loading ? <HomeLoadingState /> : null}

        {!loading && !user ? (
          <section className="section-card home-auth-card">
            <div className="home-quick-icon" aria-hidden="true">
              <PlusIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="section-title">先登录，开始安排今天</h2>
              <p className="section-description">
                不加入家庭也可以使用个人空间，登录后即可录入菜谱、点菜和生成采购清单。
              </p>
            </div>
            <div className="home-auth-actions">
              <Link href="/login" className="button-secondary">
                登录
              </Link>
              <Link href="/register" className="button-primary">
                注册
              </Link>
            </div>
          </section>
        ) : null}

        {!loading && user ? (
          <>
            {error ? (
              <div className="home-error" role="alert">
                <span>{error}</span>
                <button type="button" className="button-secondary button-sm" onClick={() => void loadHome()}>
                  重试
                </button>
              </div>
            ) : null}

            {Object.keys(sectionErrors).length ? (
              <div className="home-partial-errors" role="status">
                <span>
                  {isRefreshing ? "正在同步部分家庭数据…" : "部分信息暂时加载失败，已保留上次数据。"}
                </span>
                <button type="button" className="button-secondary button-sm" onClick={() => void loadHome()}>
                  重新加载
                </button>
              </div>
            ) : null}

            {lastHomeSyncedAt ? (
              <div className="home-sync-meta" aria-live="polite">
                <span>
                  {isRefreshing
                    ? "正在同步家庭数据…"
                    : `最近同步 ${homeSyncTimeFormatter.format(lastHomeSyncedAt)}`}
                </span>
                <span className="home-sync-meta-muted">每 30 秒自动刷新</span>
              </div>
            ) : null}

            {isCook ? (
              <>
                <FamilyMemberTonightCard menu={data.menu} isOwner={canPublishTonight} />
                {canPublishTonight ? tonightDecisionCard : null}
              </>
            ) : isFamilyMember ? (
              <FamilyDinerTonightCard menu={data.menu} />
            ) : (
              tonightDecisionCard
            )}

            {latestMenuNotice ? <SharedMenuNotice notification={latestMenuNotice} /> : null}

            <section className={`home-grid home-grid-primary ${!showTodayMenuCard ? "home-grid-member" : ""}`}>
              {showTodayMenuCard ? (
                <TodayMenuCard menu={data.menu} error={sectionErrors.menu} onRetry={() => void loadHome()} />
              ) : null}
              <ShoppingSummaryCard
                shoppingList={data.shoppingList}
                purchasedCount={purchasedCount}
                itemCount={shoppingCount}
                error={sectionErrors.shopping}
                onRetry={() => void loadHome()}
              />
            </section>

            <TodayOrdersCard groups={groupedOrders} error={sectionErrors.orders} onRetry={() => void loadHome()} />

            <section className="home-quick-grid" aria-label="快捷功能">
              <Link href={isCook ? "/menu" : "/orders"} className="home-quick-card">
                <span className="home-quick-icon home-quick-icon-green">
                  {isCook ? <MenuIcon className="h-5 w-5" /> : <OrdersIcon className="h-5 w-5" />}
                </span>
                <span className="min-w-0">
                  <span className="home-quick-title">{isCook ? "今天要做的菜" : "快速点菜"}</span>
                  <span className="home-quick-description">
                    {isCook ? "查看菜单、食材和每道菜的做法" : "从菜谱库挑几道今晚想吃的菜"}
                  </span>
                </span>
                <ArrowRightIcon className="home-quick-arrow h-4 w-4" />
              </Link>
              <Link href="/menu#shopping-list" className="home-quick-card home-quick-card-warm">
                <span className="home-quick-icon home-quick-icon-warm">
                  <MenuIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                <span className="home-quick-title">查看食材</span>
                  <span className="home-quick-description">
                    {shoppingCount ? `${purchasedCount}/${shoppingCount} 项已买` : "确认菜单后自动生成"}
                  </span>
                </span>
                <ArrowRightIcon className="home-quick-arrow h-4 w-4" />
              </Link>
              <Link href="/menu#shopping-list" className="home-quick-card">
                <span className="home-quick-icon home-quick-icon-green">
                  <ShoppingListIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="home-quick-title">查看采购清单</span>
                  <span className="home-quick-description">
                    {shoppingCount ? `${shoppingCount} 项采购内容` : "确认菜单后自动生成"}
                  </span>
                </span>
                <ArrowRightIcon className="home-quick-arrow h-4 w-4" />
              </Link>
            </section>
          </>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

function SharedMenuNotice({ notification }: { notification: Notification }) {
  return (
    <section className="home-shared-notice" aria-labelledby="shared-menu-notice-title">
      <div className="home-shared-notice-copy">
        <span className="home-shared-notice-mark" aria-hidden="true">!</span>
        <div className="min-w-0">
          <h2 id="shared-menu-notice-title" className="text-sm font-semibold text-emerald-950">
            {notification.title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-emerald-900/80">{notification.content}</p>
        </div>
      </div>
      <Link href={notification.link_url ?? "/menu"} className="button-primary button-sm shrink-0">
        查看今晚菜单
      </Link>
    </section>
  );
}

function FamilyMemberTonightCard({
  menu,
  isOwner,
}: {
  menu: DailyMenu | null;
  isOwner: boolean;
}) {
  return (
    <section className="section-card home-member-tonight-card" aria-labelledby="family-tonight-title">
      <div className="section-head">
        <div>
          <p className="text-sm font-semibold text-emerald-700">做饭人 · 家庭共享</p>
          <h2 id="family-tonight-title" className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
            今天做什么？
          </h2>
          <p className="section-description">
            {isOwner
              ? "先在这里查看今天菜单，需要调整时可在下方直接安排。"
              : "家庭菜单发布后，今天要做的菜会直接显示在这里。"}
          </p>
        </div>
        <span className={`chip ${menu?.status === "confirmed" ? "chip-accent" : "chip-neutral"}`}>
          {menu?.status === "confirmed" ? "已发布" : "等待发布"}
        </span>
      </div>

      {menu?.items.length ? (
        <div className="home-menu-list mt-5">
          {menu.items.slice(0, 6).map((item) => (
            <Link key={item.id} href={`/recipes/${item.recipe.id}`} className="home-menu-item">
              <RecipeThumb
                src={item.recipe.image_url}
                title={item.recipe.title}
                category={item.recipe.category}
                variant="sm"
                className="h-12 w-16 shrink-0 rounded-[10px]"
              />
              <span className="min-w-0 flex-1">
                <span className="block line-clamp-2 break-words font-medium text-stone-900">{item.recipe.title}</span>
                <span className="mt-1 block text-xs text-stone-500">
                  {item.recipe.cooking_time ? `${item.recipe.cooking_time} 分钟` : "时间待定"}
                </span>
              </span>
              <span className="text-xs text-stone-400">查看</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="home-empty-state mt-5">
          <p className="font-medium text-stone-800">今晚菜单还没发布</p>
          <p className="mt-1 text-sm leading-6 text-stone-500">发布后这里会自动同步，届时可以直接查看并反馈。</p>
        </div>
      )}

      <div className="home-card-footer mt-4">
        <span className="text-sm text-stone-500">
          {menu?.items.length ? `${menu.items.length} 道菜 · ${menu.meal_time} 开饭 · ${menu.servings} 人份` : "等待家庭创建者安排"}
        </span>
        <Link href="/menu" className="button-primary button-sm">
          打开家庭菜单
        </Link>
      </div>
    </section>
  );
}

function FamilyDinerTonightCard({ menu }: { menu: DailyMenu | null }) {
  return (
    <section className="section-card home-member-tonight-card" aria-labelledby="diner-tonight-title">
      <div className="section-head">
        <div>
          <p className="text-sm font-semibold text-emerald-700">干饭人 · 家庭共享</p>
          <h2 id="diner-tonight-title" className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
            先点几道想吃的
          </h2>
          <p className="section-description">把你的选择交给做饭的人，家庭菜单发布后也能在这里查看。</p>
        </div>
        <span className="chip chip-accent">负责点菜</span>
      </div>

      {menu?.items.length ? (
        <div className="home-empty-state mt-5">
          <p className="font-medium text-stone-800">今晚菜单已发布</p>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            {menu.items.map((item) => item.recipe.title).join("、")}
          </p>
        </div>
      ) : (
        <div className="home-empty-state mt-5">
          <p className="font-medium text-stone-800">今晚还等你的选择</p>
          <p className="mt-1 text-sm leading-6 text-stone-500">从家庭菜谱里选几道你想吃的菜吧。</p>
        </div>
      )}

      <div className="home-card-footer mt-4">
        <span className="text-sm text-stone-500">
          {menu?.items.length ? `${menu.items.length} 道菜 · ${menu.meal_time} 开饭` : "提交后做饭人会看到"}
        </span>
        <Link href="/orders" className="button-primary button-sm">
          去点菜
        </Link>
      </div>
    </section>
  );
}

type TonightDecisionCardProps = {
  mode: "recommend" | "custom";
  onModeChange: (mode: "recommend" | "custom") => void;
  recommendationRecipes: RecipeSummary[];
  customRecipes: RecipeSummary[];
  customSearch: string;
  onCustomSearchChange: (value: string) => void;
  selectedRecipeIds: number[];
  servings: number;
  onServingsChange: (value: number) => void;
  onToggleRecipe: (recipeId: number) => void;
  onShuffle: () => void;
  onUseRecommendation: () => void;
  onPublish: () => void;
  canPublish: boolean;
  publishing: boolean;
  message: string | null;
  error: string | null;
  recipeError?: string;
  onRetryRecipes?: () => void;
  menu: DailyMenu | null;
};

function TonightDecisionCard({
  mode,
  onModeChange,
  recommendationRecipes,
  customRecipes,
  customSearch,
  onCustomSearchChange,
  selectedRecipeIds,
  servings,
  onServingsChange,
  onToggleRecipe,
  onShuffle,
  onUseRecommendation,
  onPublish,
  canPublish,
  publishing,
  message,
  error,
  recipeError,
  onRetryRecipes,
  menu,
}: TonightDecisionCardProps) {
  return (
    <section className="section-card tonight-decision-card" aria-labelledby="tonight-decision-title">
      <div className="section-head">
        <div>
          <p className="text-sm font-semibold text-emerald-700">今晚的家庭安排</p>
          <h2 id="tonight-decision-title" className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
            今天晚上吃什么？
          </h2>
          <p className="section-description">
            你来决定，发布后全家都能看到今晚菜单。
          </p>
        </div>
        <span className={`chip ${menu?.status === "confirmed" ? "chip-accent" : "chip-neutral"}`}>
          {menu?.status === "confirmed" ? "已发布 · 全家可见" : "还未发布"}
        </span>
      </div>

      <div className="tonight-mode-switch" role="group" aria-label="选择安排方式">
        <button
          type="button"
          className={mode === "recommend" ? "tonight-mode-button is-active" : "tonight-mode-button"}
          onClick={() => onModeChange("recommend")}
          aria-pressed={mode === "recommend"}
        >
          帮我推荐
        </button>
        <button
          type="button"
          className={mode === "custom" ? "tonight-mode-button is-active" : "tonight-mode-button"}
          onClick={() => onModeChange("custom")}
          aria-pressed={mode === "custom"}
        >
          自己安排
        </button>
      </div>

      {recipeError ? (
        <HomeSectionError message={recipeError} onRetry={onRetryRecipes} />
      ) : null}

      {mode === "recommend" ? (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-stone-800">
              优先搭配一道荤菜和一道素菜，再补一道汤或主食
            </p>
            <button type="button" className="button-ghost button-sm" onClick={onShuffle}>
              <RotateCcwIcon className="mr-2 h-4 w-4" />
              换一批
            </button>
          </div>

          {recommendationRecipes.length ? (
            <div>
              <div className="tonight-recommendation-grid">
                {recommendationRecipes.map((recipe) => (
                  <TonightRecipeOption
                    key={recipe.id}
                    recipe={recipe}
                    reason={getRecommendationReason(recipe)}
                    selected={selectedRecipeIds.includes(recipe.id)}
                    onToggle={onToggleRecipe}
                  />
                ))}
              </div>
              <button type="button" className="button-secondary mt-3 w-full sm:w-auto" onClick={onUseRecommendation}>
                使用这组菜单
              </button>
            </div>
          ) : (
            <div className="home-empty-state">
              <p className="font-medium text-stone-800">菜谱库还没有可推荐的菜</p>
              <p className="mt-1 text-sm leading-6 text-stone-500">先录入几道家常菜，之后就能快速安排今晚菜单。</p>
              <Link href="/recipes/manual" className="button-primary button-sm mt-4">
                录入菜谱
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5">
          <label className="block">
            <span className="sr-only">搜索要安排的菜谱</span>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={customSearch}
                onChange={(event) => onCustomSearchChange(event.target.value)}
                className="field pl-11"
                placeholder="搜索菜名，例如：番茄炒蛋"
              />
            </div>
          </label>

          {customRecipes.length ? (
            <div className="tonight-custom-grid">
              {customRecipes.map((recipe) => (
                <TonightRecipeOption
                  key={recipe.id}
                  recipe={recipe}
                  selected={selectedRecipeIds.includes(recipe.id)}
                  onToggle={onToggleRecipe}
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="home-empty-state">
              <p className="font-medium text-stone-800">没有找到匹配的菜谱</p>
              <Link href="/recipes" className="button-secondary button-sm mt-4">
                查看完整菜谱库
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="tonight-publish-bar">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900">
            已选 {selectedRecipeIds.length} 道菜
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-stone-600">
              <span>用餐人数</span>
              <input
                type="number"
                min={1}
                max={20}
                value={servings}
                onChange={(event) => onServingsChange(Number(event.target.value) || 1)}
                className="field h-9 w-20 px-3 py-1.5 text-center"
              />
            </label>
            <span className="text-xs text-stone-500">发布后家庭成员即可查看</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onPublish}
          disabled={!canPublish || publishing || selectedRecipeIds.length === 0}
          className="button-primary shrink-0"
        >
          {publishing
            ? "发布中..."
            : !canPublish
              ? "仅管理员可发布"
              : menu?.status === "confirmed"
                ? "更新并发布"
                : "确认并发布"}
        </button>
      </div>

      {!canPublish ? (
        <p className="mt-3 text-xs leading-5 text-stone-500">
          你可以查看家庭菜单，但只有家庭创建者可以确认并发布今晚菜单。
        </p>
      ) : null}

      {message ? <p className="mt-3 inline-message inline-message-success" role="status">{message}</p> : null}
      {error ? <p className="mt-3 inline-message inline-message-error" role="alert">{error}</p> : null}
    </section>
  );
}

function TonightRecipeOption({
  recipe,
  reason,
  selected,
  onToggle,
  compact = false,
}: {
  recipe: RecipeSummary;
  reason?: string;
  selected: boolean;
  onToggle: (recipeId: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={`tonight-recipe-option ${selected ? "is-selected" : ""} ${compact ? "is-compact" : ""}`}>
      <button
        type="button"
        onClick={() => onToggle(recipe.id)}
        aria-pressed={selected}
        className="tonight-recipe-button"
      >
        <RecipeThumb
          src={recipe.image_url}
          title={recipe.title}
          category={recipe.category}
          variant={compact ? "sm" : "md"}
          className={compact ? "h-14 w-16 shrink-0 rounded-[10px]" : "aspect-[4/3] rounded-[12px]"}
        />
        <span className="min-w-0 flex-1 text-left">
          <span className="block line-clamp-2 break-words text-sm font-semibold text-stone-900">{recipe.title}</span>
          <span className="mt-1 block text-xs text-stone-500">
            {recipe.category}
            {recipe.cooking_time ? ` · ${recipe.cooking_time} 分钟` : ""}
          </span>
          {reason ? <span className="mt-1 block text-xs font-medium text-emerald-700">{reason}</span> : null}
        </span>
        <span className={`tonight-select-mark ${selected ? "is-selected" : ""}`} aria-hidden="true">
          {selected ? "已选" : "选择"}
        </span>
      </button>
      <Link href={`/recipes/${recipe.id}`} className="tonight-recipe-detail">
        查看详情
      </Link>
    </div>
  );
}

function getRecommendationReason(recipe: RecipeSummary) {
  return recipe.preference_reasons[0]
    ?? (recipe.is_favorite ? "你收藏过" : recipe.cooking_time ? `${recipe.cooking_time} 分钟可完成` : "换换口味");
}

function TodayMenuCard({
  menu,
  error,
  onRetry,
}: {
  menu: DailyMenu | null;
  error?: string;
  onRetry: () => void;
}) {
  return (
    <section className="section-card home-menu-card">
      <div className="section-head">
        <div>
          <h2 className="section-title">今日菜单</h2>
          <p className="section-description">确认好的晚餐安排会显示在这里。</p>
        </div>
        <span className={`chip ${menu?.status === "confirmed" ? "chip-accent" : "chip-neutral"}`}>
          {getMenuState(menu)}
        </span>
      </div>

      {error ? <HomeSectionError message={error} onRetry={onRetry} /> : null}

      {menu?.items.length ? (
        <>
          <div className="home-menu-list">
            {menu.items.slice(0, 6).map((item) => (
              <Link key={item.id} href={`/recipes/${item.recipe.id}`} className="home-menu-item">
                <RecipeThumb
                  src={item.recipe.image_url}
                  title={item.recipe.title}
                  category={item.recipe.category}
                  variant="sm"
                  className="h-12 w-16 shrink-0 rounded-[10px]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block line-clamp-2 break-words font-medium text-stone-900">{item.recipe.title}</span>
                  <span className="mt-1 block text-xs text-stone-500">
                    {item.recipe.cooking_time ? `${item.recipe.cooking_time} 分钟` : "时间待定"}
                  </span>
                </span>
                <span className="text-xs text-stone-400">查看</span>
              </Link>
            ))}
          </div>
          <div className="home-card-footer">
            <span className="text-sm text-stone-500">
              {menu.items.length} 道菜 · {menu.meal_time} 开饭 · {menu.servings} 人份
            </span>
            <Link href="/menu" className="button-secondary button-sm">
              查看详情
            </Link>
          </div>
        </>
      ) : (
        <div className="home-empty-state">
          <p className="font-medium text-stone-800">今天还没有菜单</p>
          <p className="mt-1 text-sm leading-6 text-stone-500">先去点菜，再确认今晚吃什么。</p>
          <Link href="/orders" className="button-primary button-sm mt-4">
            去点菜
          </Link>
        </div>
      )}
    </section>
  );
}

function ShoppingSummaryCard({
  shoppingList,
  purchasedCount,
  itemCount,
  error,
  onRetry,
}: {
  shoppingList: ShoppingList | null;
  purchasedCount: number;
  itemCount: number;
  error?: string;
  onRetry: () => void;
}) {
  return (
    <section className="section-card home-shopping-card">
      <div className="section-head">
        <div>
          <h2 className="section-title">食材清单</h2>
          <p className="section-description">买菜进度一眼就能看到。</p>
        </div>
        <MenuIcon className="h-5 w-5 text-emerald-600" />
      </div>

      {error ? <HomeSectionError message={error} onRetry={onRetry} /> : null}

      {shoppingList && itemCount ? (
        <>
          <div className="home-shopping-progress">
            <strong>{purchasedCount}</strong>
            <span>/ {itemCount} 项已购买</span>
          </div>
          <div className="home-progress-track" aria-hidden="true">
            <span style={{ width: `${Math.round((purchasedCount / itemCount) * 100)}%` }} />
          </div>
          <ul className="home-shopping-preview">
            {shoppingList.items.slice(0, 4).map((item) => (
              <li key={item.id} className={item.is_purchased ? "home-shopping-item is-purchased" : "home-shopping-item"}>
                <span className="home-shopping-dot" aria-hidden="true" />
                <span className="truncate">{item.name}</span>
                <span className="shrink-0 text-xs text-stone-500">{item.amount}{item.unit}</span>
              </li>
            ))}
          </ul>
          <Link href="/menu#shopping-list" className="button-secondary button-sm mt-4 w-full">
            查看食材清单
          </Link>
        </>
      ) : (
        <div className="home-empty-state home-empty-state-compact">
          <p className="font-medium text-stone-800">确认菜单后自动生成</p>
          <p className="mt-1 text-sm leading-6 text-stone-500">采购清单会根据今日菜单整理食材。</p>
          <Link href="/menu" className="button-secondary button-sm mt-4">
            去看今日菜单
          </Link>
        </div>
      )}
    </section>
  );
}

function TodayOrdersCard({
  groups,
  error,
  onRetry,
}: {
  groups: Array<{ user: User; orders: DishOrder[] }>;
  error?: string;
  onRetry: () => void;
}) {
  return (
    <section className="section-card">
      <div className="section-head">
        <div>
          <h2 className="section-title">今日点菜</h2>
          <p className="section-description">看看家里每个人想吃什么。</p>
        </div>
        <Link href="/orders" className="button-ghost button-sm">
          查看全部
        </Link>
      </div>

      {error ? <HomeSectionError message={error} onRetry={onRetry} /> : null}

      {groups.length ? (
        <div className="home-orders-list">
          {groups.map((group) => (
            <div key={group.user.id} className="home-order-row">
              <UserAvatar name={group.user.username} small />
              <span className="home-order-name">{group.user.username}</span>
              <div className="home-order-recipes">
                {group.orders.slice(0, 4).map((order) => (
                  <RecipeThumb
                    key={order.id}
                    src={order.recipe.image_url}
                    title={order.recipe.title}
                    category={order.recipe.category}
                    variant="sm"
                    className="h-10 w-12 shrink-0 rounded-[8px]"
                  />
                ))}
                {group.orders.length > 4 ? (
                  <span className="home-order-more">+{group.orders.length - 4}</span>
                ) : null}
              </div>
              <span className="chip chip-neutral shrink-0">{group.orders.length} 道菜</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="home-empty-state">
          <p className="font-medium text-stone-800">今天还没有人点菜</p>
          <p className="mt-1 text-sm leading-6 text-stone-500">选几道喜欢的菜，今晚的菜单就有方向了。</p>
          <Link href="/orders" className="button-primary button-sm mt-4">
            开始点菜
          </Link>
        </div>
      )}
    </section>
  );
}

function HomeSectionError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="home-section-error" role="alert">
      <span>{message}，请重试。</span>
      {onRetry ? (
        <button type="button" className="button-ghost button-sm" onClick={onRetry}>
          重试
        </button>
      ) : null}
    </div>
  );
}

function RecommendedRecipes({ recipes }: { recipes: RecipeSummary[] }) {
  return (
    <section className="section-card home-recommendations">
      <div className="section-head">
        <div>
          <h2 className="section-title">推荐菜谱</h2>
          <p className="section-description">从你的菜谱库里挑一道今天想做的。</p>
        </div>
        <Link href="/recipes" className="button-ghost button-sm">
          查看菜谱库
        </Link>
      </div>

      {recipes.length ? (
        <div className="home-recipe-strip">
          {recipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="home-recipe-card">
              <RecipeThumb
                src={recipe.image_url}
                title={recipe.title}
                category={recipe.category}
                variant="md"
                className="rounded-[12px]"
              />
              <span className="mt-3 block line-clamp-2 break-words font-medium text-stone-900">{recipe.title}</span>
              <span className="mt-1 block text-xs text-stone-500">
                {recipe.cooking_time ? `${recipe.cooking_time} 分钟` : "时间待定"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="home-empty-state">
          <p className="font-medium text-stone-800">菜谱库还没有内容</p>
          <p className="mt-1 text-sm leading-6 text-stone-500">先手动录入一道家常菜，之后点菜会更方便。</p>
          <Link href="/recipes/manual" className="button-primary button-sm mt-4">
            录入第一道菜
          </Link>
        </div>
      )}
    </section>
  );
}

function HomeLoadingState() {
  return (
    <div className="home-loading" aria-live="polite" aria-label="正在加载首页">
      <div className="home-loading-main">
        <div className="home-skeleton home-skeleton-title" />
        <div className="home-skeleton home-skeleton-line" />
        <div className="home-skeleton home-skeleton-block" />
      </div>
      <div className="home-loading-side">
        <div className="home-skeleton home-skeleton-title" />
        <div className="home-skeleton home-skeleton-block" />
      </div>
    </div>
  );
}
