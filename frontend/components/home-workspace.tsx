"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ArrowRightIcon,
  MenuIcon,
  NotificationsIcon,
  OrdersIcon,
  PlusIcon,
  ShoppingListIcon,
} from "@/components/icons";
import { RecipeThumb } from "@/components/recipe-thumb";
import { UserAvatar } from "@/components/user-avatar";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getCurrentUser } from "@/services/auth";
import { getTodayMenu } from "@/services/daily-menus";
import { getTodayDishOrders } from "@/services/dish-orders";
import { getNotifications } from "@/services/notifications";
import { getRecipes } from "@/services/recipes";
import { getTodayShoppingList } from "@/services/shopping-lists";
import type { User } from "@/types/auth";
import type { DailyMenu } from "@/types/daily-menu";
import type { DishOrder } from "@/types/dish-order";
import type { Notification } from "@/types/notification";
import type { RecipeSummary } from "@/types/recipe";
import type { ShoppingList } from "@/types/shopping-list";

type HomeData = {
  menu: DailyMenu | null;
  orders: DishOrder[];
  recipes: RecipeSummary[];
  notifications: Notification[];
  unreadCount: number;
  shoppingList: ShoppingList | null;
};

const emptyHomeData: HomeData = {
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

function getPromiseValue<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

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

  return menu.status === "confirmed" ? "已确认" : "待确认";
}

export function HomeWorkspace() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [data, setData] = useState<HomeData>(emptyHomeData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHome = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser) {
        setData(emptyHomeData);
        return;
      }

      const [menuResult, ordersResult, recipesResult, notificationsResult, shoppingResult] =
        await Promise.allSettled([
          getTodayMenu(),
          getTodayDishOrders(),
          getRecipes(),
          getNotifications(),
          getTodayShoppingList(),
        ]);

      const menuResponse = getPromiseValue(menuResult, { menu: null, orders: [] });
      const orders = getPromiseValue(ordersResult, []);
      const recipes = getPromiseValue(recipesResult, []);
      const notificationsResponse = getPromiseValue(notificationsResult, {
        notifications: [],
        unread_count: 0,
      });
      const shoppingResponse = getPromiseValue(shoppingResult, {
        shopping_list: null,
        menu: null,
      });
      const successfulRequests = [
        menuResult,
        ordersResult,
        recipesResult,
        notificationsResult,
        shoppingResult,
      ].filter((result) => result.status === "fulfilled").length;

      setData({
        menu: menuResponse.menu,
        orders: orders.length ? orders : menuResponse.orders,
        recipes,
        notifications: notificationsResponse.notifications,
        unreadCount: notificationsResponse.unread_count,
        shoppingList: shoppingResponse.shopping_list,
      });

      if (successfulRequests === 0) {
        setError("首页数据加载失败，请点击重试。");
      }
    } catch {
      setError("登录状态加载失败，请点击重试。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  const groupedOrders = useMemo(() => groupOrders(data.orders), [data.orders]);
  const recommendations = data.recipes.slice(0, 6);
  const purchasedCount = data.shoppingList?.items.filter((item) => item.is_purchased).length ?? 0;
  const shoppingCount = data.shoppingList?.items.length ?? 0;
  const today = dateFormatter.format(new Date());

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
            <Link href="/orders" className="button-primary">
              <OrdersIcon className="mr-2 h-4 w-4" />
              快速点菜
            </Link>
            <Link href="/menu" className="button-secondary">
              查看今日菜单
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

            <section className="home-grid home-grid-primary">
              <TodayMenuCard menu={data.menu} />
              <ShoppingSummaryCard shoppingList={data.shoppingList} purchasedCount={purchasedCount} itemCount={shoppingCount} />
            </section>

            <TodayOrdersCard groups={groupedOrders} />
            <RecommendedRecipes recipes={recommendations} />

            <section className="home-quick-grid" aria-label="快捷功能">
              <Link href="/orders" className="home-quick-card">
                <span className="home-quick-icon home-quick-icon-green">
                  <OrdersIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="home-quick-title">快速点菜</span>
                  <span className="home-quick-description">从菜谱库挑几道今晚想吃的菜</span>
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

function TodayMenuCard({ menu }: { menu: DailyMenu | null }) {
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
                  <span className="block truncate font-medium text-stone-900">{item.recipe.title}</span>
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
              {menu.items.length} 道菜 · 预计 {menu.servings} 人
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
}: {
  shoppingList: ShoppingList | null;
  purchasedCount: number;
  itemCount: number;
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

function TodayOrdersCard({ groups }: { groups: Array<{ user: User; orders: DishOrder[] }> }) {
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
              <span className="mt-3 block truncate font-medium text-stone-900">{recipe.title}</span>
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
