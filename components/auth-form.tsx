"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  UserPlus,
} from "lucide-react";
import { apiUrl, login, register, saveAuthSession } from "../lib/auth";

type AuthMode = "login" | "register";

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const isLogin = mode === "login";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const credentials = { username: username.trim(), password };

      // 注册接口只创建用户、不签发令牌，因此注册成功后复用登录流程获取 JWT。
      if (!isLogin) await register(credentials);

      const session = await login(credentials);
      saveAuthSession(session);
      router.replace("/");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "认证失败，请稍后重试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-950">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-950"
        >
          <span aria-hidden="true">←</span>
          返回聊天
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-9">
          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              {isLogin ? <LogIn size={22} /> : <UserPlus size={22} />}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isLogin ? "登录账户" : "创建账户"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isLogin
                ? "输入用户名和密码，登录后获取 JWT。"
                : "注册成功后将自动登录并进入聊天页面。"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                minLength={3}
                maxLength={150}
                pattern="[A-Za-z][A-Za-z0-9_]{2,149}"
                title="以字母开头，仅使用字母、数字或下划线"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="例如 xinyi_01"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm transition outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
              {!isLogin && (
                <p className="mt-2 text-xs text-slate-400">
                  以字母开头，仅使用字母、数字或下划线。
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                密码
              </label>
              <div className="relative">
                <LockKeyhole
                  size={17}
                  className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  minLength={isLogin ? 1 : 8}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isLogin ? "输入密码" : "至少 8 个字符"}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-4 pl-11 text-sm transition outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>
              {!isLogin && (
                <p className="mt-2 text-xs text-slate-400">
                  不能包含空格，并至少包含两类字符。
                </p>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? "登录并获取 JWT" : "注册并登录"}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            {isLogin ? "还没有账户？" : "已经有账户？"}
            <Link
              href={isLogin ? "/register" : "/login"}
              className="ml-1 font-medium text-slate-950 underline underline-offset-4"
            >
              {isLogin ? "立即注册" : "立即登录"}
            </Link>
          </p>
        </section>

        <p className="mt-5 text-center text-xs text-slate-400">
          认证服务：{apiUrl}
        </p>
      </div>
    </main>
  );
}
