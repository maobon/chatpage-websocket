import Link from "next/link";
import { LogIn, LogOut, MessageSquareText } from "lucide-react";
import type { AuthSession } from "../lib/auth";
import { clearAuthSession } from "../lib/auth";
import type { ConnectionStatus } from "../hooks/use-websocket-chat";

const statusView: Record<
  ConnectionStatus,
  { label: string; dotClassName: string }
> = {
  connecting: {
    label: "正在连接",
    dotClassName: "animate-pulse bg-amber-400",
  },
  open: {
    label: "服务已连接",
    dotClassName: "bg-emerald-500",
  },
  closed: {
    label: "连接已断开",
    dotClassName: "bg-rose-500",
  },
  error: {
    label: "连接已断开",
    dotClassName: "bg-rose-500",
  },
};

type ChatHeaderProps = {
  authSession: AuthSession | null;
  connectionStatus: ConnectionStatus;
  onReconnect: () => void;
};

export default function ChatHeader({
  authSession,
  connectionStatus,
  onReconnect,
}: ChatHeaderProps) {
  const currentStatus = statusView[connectionStatus];
  const canReconnect =
    connectionStatus !== "open" && connectionStatus !== "connecting";

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
          <MessageSquareText size={19} />
        </div>
        <div>
          <h1 className="font-semibold">Chat Room</h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${currentStatus.dotClassName}`}
            />
            {currentStatus.label}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {canReconnect && (
            <button
              type="button"
              onClick={onReconnect}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            >
              重新连接
            </button>
          )}

          {authSession ? (
            <>
              <span className="hidden max-w-32 truncate text-xs text-slate-500 sm:block">
                {authSession.username}
              </span>
              <button
                type="button"
                aria-label="退出登录"
                title="退出登录"
                onClick={clearAuthSession}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-950"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-950 px-3 text-xs font-medium text-white transition hover:bg-slate-800"
            >
              <LogIn size={15} />
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
