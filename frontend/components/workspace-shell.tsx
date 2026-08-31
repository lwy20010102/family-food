"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  BrandMark,
  CalendarIcon,
  FamilyIcon,
  HomeIcon,
  MenuIcon,
  NotificationsIcon,
  OrdersIcon,
  PlusIcon,
  RecipesIcon,
  StatisticsIcon,
} from "@/components/icons";

type WorkspaceAction = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
  icon?: ReactNode;
  iconOnly?: boolean;
  badge?: number;
};

type WorkspaceShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  actions?: WorkspaceAction[];
};

type NavItem = {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: ReactNode;
  match?: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/",
    label: "首页",
    icon: <HomeIcon className="h-4 w-4" />,
    match: (pathname) => pathname === "/",
  },
  {
    href: "/recipes",
    label: "菜谱库",
    icon: <RecipesIcon className="h-4 w-4" />,
    match: (pathname) => pathname.startsWith("/recipes"),
  },
  {
    href: "/orders",
    label: "点菜",
    icon: <OrdersIcon className="h-4 w-4" />,
    match: (pathname) => pathname.startsWith("/orders"),
  },
  {
    href: "/menu",
    label: "今日菜单",
    icon: <MenuIcon className="h-4 w-4" />,
    match: (pathname) => pathname.startsWith("/menu"),
  },
  {
    href: "/weekly-menu",
    label: "本周菜单",
    icon: <CalendarIcon className="h-4 w-4" />,
    match: (pathname) => pathname.startsWith("/weekly-menu"),
  },
  {
    href: "/notifications",
    label: "通知",
    icon: <NotificationsIcon className="h-4 w-4" />,
    match: (pathname) => pathname.startsWith("/notifications"),
  },
  {
    href: "/statistics",
    label: "家庭统计",
    mobileLabel: "统计",
    icon: <StatisticsIcon className="h-4 w-4" />,
    match: (pathname) => pathname.startsWith("/statistics"),
  },
  {
    href: "/family",
    label: "我的",
    icon: <FamilyIcon className="h-4 w-4" />,
    match: (pathname) => pathname.startsWith("/family"),
  },
  {
    href: "/recipes/manual",
    label: "手动录入",
    icon: <PlusIcon className="h-4 w-4" />,
    match: (pathname) =>
      pathname.startsWith("/recipes/manual") || pathname.startsWith("/recipes/ai"),
  },
];

function isActiveItem(item: NavItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname === item.href;
}

export function WorkspaceShell({
  title,
  description,
  children,
  actions,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const activeItems = navItems.map((item) => ({
    ...item,
    active: isActiveItem(item, pathname),
  }));
  const mobilePrimaryItems = activeItems.filter(
    (item) => item.href === "/" || item.href === "/recipes" || item.href === "/weekly-menu",
  );
  const mobileSecondaryItems = activeItems.filter(
    (item) =>
      item.href === "/notifications" ||
      item.href === "/family" ||
      item.href === "/statistics",
  );

  return (
    <div className="workspace-shell">
      <div className="workspace-grid">
        <aside className="workspace-sidebar">
          <div className="workspace-brand">
            <span className="workspace-brand-mark text-emerald-700">
              <BrandMark className="h-7 w-7" />
            </span>
            <div className="workspace-brand-copy">
              <p className="workspace-brand-name">FamilyFood</p>
              <p className="workspace-brand-note">家庭点菜平台</p>
            </div>
          </div>

          <nav className="workspace-nav">
            {activeItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-active={item.active}
                className="workspace-nav-link"
              >
                <span className="workspace-nav-icon">{item.icon}</span>
                <span>{item.mobileLabel ?? item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto surface-card-soft p-4">
            <p className="text-sm font-semibold text-emerald-950">快速入口</p>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              先录入菜谱，再到今日菜单和点菜页确认今晚吃什么。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/recipes/manual" className="button-primary button-sm">
                开始录入
              </Link>
              <Link href="/menu" className="button-secondary button-sm">
                今日菜单
              </Link>
            </div>
          </div>
        </aside>

        <div className="workspace-main">
          <header className="workspace-hero">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 space-y-2">
                <h1 className="workspace-title">{title}</h1>
                <p className="workspace-description">{description}</p>
              </div>

              {actions?.length ? (
                <div className="workspace-toolbar">
                  {actions.map((action) => (
                    <Link
                      key={`${action.href}-${action.label}`}
                      href={action.href}
                      aria-label={action.iconOnly ? action.label : undefined}
                      title={action.iconOnly ? action.label : undefined}
                      className={
                        action.iconOnly
                          ? "workspace-action-icon button-secondary"
                          : action.tone === "primary"
                            ? "button-primary"
                            : "button-secondary"
                      }
                    >
                      {action.icon}
                      <span className={action.iconOnly ? "sr-only" : undefined}>{action.label}</span>
                      {action.iconOnly && action.badge ? (
                        <span className="workspace-action-badge" aria-hidden="true">
                          {action.badge > 99 ? "99+" : action.badge}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </header>

          <div className="page-stack pt-4">{children}</div>
        </div>
      </div>

      <nav className="mobile-nav" aria-label="主要导航">
        <div className="mobile-nav-surface">
          <div className="mobile-nav-grid">
            {mobilePrimaryItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-active={item.active}
                className="mobile-nav-link"
              >
                <span className="mobile-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}

            <Link href="/recipes/manual" className="mobile-nav-center">
              <span className="mobile-nav-center-bubble">
                <PlusIcon className="h-5 w-5" />
              </span>
              <span>录入</span>
            </Link>

            {mobileSecondaryItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={item.active}
                  className="mobile-nav-link"
                >
                  <span className="mobile-nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
