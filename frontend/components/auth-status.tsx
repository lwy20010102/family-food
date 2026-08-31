"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { logoutUser, getCurrentUser } from "@/services/auth";
import type { User } from "@/types/auth";
import { UserAvatar } from "@/components/user-avatar";

export function AuthStatus() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const currentUser = await getCurrentUser();
        if (active) {
          setUser(currentUser);
        }
      } catch {
        if (active) {
          setError("当前登录状态加载失败");
          setUser(null);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutUser();
      setUser(null);
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <section className="section-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="section-title">登录状态</h2>
          <p className="section-description">
            用于确认当前账号和后端会话是否连通。
          </p>
        </div>
        <span className="chip chip-neutral">
          {user === undefined ? "检查中" : user ? "已登录" : "未登录"}
        </span>
      </div>

      {error ? (
        <p className="mt-4 inline-message inline-message-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        {user === undefined ? (
          <p className="text-sm text-stone-500">正在获取当前用户信息...</p>
        ) : user ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <UserAvatar name={user.username} />
              <div>
                <p className="text-lg font-semibold text-stone-900">{user.username}</p>
                <p className="mt-1 text-sm text-stone-600">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="button-primary"
            >
              {loggingOut ? "退出中..." : "退出登录"}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="button-secondary"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="button-primary"
            >
              注册
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
