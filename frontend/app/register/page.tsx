"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { AuthShell } from "@/components/auth-shell";
import { registerUser } from "@/services/auth";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      setLoading(false);
      return;
    }

    try {
      await registerUser({ username, email, password });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "注册失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="创建账号"
      description="注册个人账号即可开始使用，加入家庭是可选的。"
      footer={
        <p className="text-sm text-stone-600">
          已有账号？{" "}
          <Link href="/login" className="font-medium text-emerald-700">
            去登录
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="label">用户名</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="field"
            placeholder="Li"
            required
          />
        </label>

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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field"
            placeholder="至少 8 位"
            required
          />
        </label>

        <label className="block">
          <span className="label">确认密码</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="field"
            placeholder="再次输入密码"
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
          {loading ? "注册中..." : "注册"}
        </button>
      </form>
    </AuthShell>
  );
}
