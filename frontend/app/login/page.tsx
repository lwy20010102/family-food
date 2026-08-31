"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { AuthShell } from "@/components/auth-shell";
import { loginUser } from "@/services/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await loginUser({ email, password });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="欢迎回来"
      description="使用邮箱和密码登录你的个人或家庭空间。"
      footer={
        <p className="text-sm text-stone-600">
          还没有账号？{" "}
          <Link href="/register" className="font-medium text-emerald-700">
            去注册
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="label">邮箱</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field"
            placeholder="name@example.com"
            required
          />
        </label>

        <label className="block">
          <span className="label">密码</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field"
            placeholder="至少 8 位"
            required
          />
        </label>

        {error ? (
          <p className="inline-message inline-message-error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="button-primary w-full"
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </form>
    </AuthShell>
  );
}
