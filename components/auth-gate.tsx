import Link from "next/link";
import { LoaderCircle, LockKeyhole, RefreshCw } from "lucide-react";
import type { AuthStatus } from "../hooks/use-auth-session";

type AuthGateProps = {
  authStatus: Exclude<AuthStatus, "authenticated">;
  onRetry: () => void;
};

export default function AuthGate({ authStatus, onRetry }: AuthGateProps) {
  const hasVerificationError = authStatus === "error";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 text-slate-950">
      <section className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          {hasVerificationError ? (
            <LockKeyhole size={22} />
          ) : (
            <LoaderCircle size={22} className="animate-spin" />
          )}
        </div>
        <h1 className="text-lg font-semibold">
          {hasVerificationError ? "无法验证登录状态" : "正在验证登录状态"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {hasVerificationError
            ? "认证服务暂时不可用。验证成功前不会加载聊天界面。"
            : "只有有效的 access token 才能进入聊天界面。"}
        </p>

        {hasVerificationError && (
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <RefreshCw size={16} />
              重新验证
            </button>
            <Link
              href="/login"
              className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            >
              返回登录
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
