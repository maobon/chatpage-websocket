import type { FormEvent, KeyboardEvent, RefObject } from "react";
import { SendHorizontal } from "lucide-react";
import type { ConnectionStatus } from "../hooks/use-websocket-chat";

type ChatComposerProps = {
  connectionStatus: ConnectionStatus;
  error: string;
  input: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onSend: (content: string) => boolean;
  websocketUrl: string;
};

export default function ChatComposer({
  connectionStatus,
  error,
  input,
  inputRef,
  onInputChange,
  onSend,
  websocketUrl,
}: ChatComposerProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (onSend(input)) onInputChange("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 bg-linear-to-t from-slate-50 via-slate-50 to-transparent px-5 pt-10 pb-5">
      {error && (
        <p className="mx-auto mb-2 max-w-3xl text-center text-xs text-rose-600">
          {error}
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-3xl items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/60"
      >
        <label htmlFor="message" className="sr-only">
          输入消息
        </label>
        <textarea
          id="message"
          ref={inputRef}
          rows={1}
          autoFocus
          placeholder="输入消息，Enter 发送"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          aria-label="发送消息"
          disabled={!input.trim() || connectionStatus !== "open"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          <SendHorizontal size={18} />
        </button>
      </form>
      <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-slate-400">
        {connectionStatus === "open"
          ? "消息将广播给其他在线客户端。"
          : `等待连接 ${websocketUrl}`}
      </p>
    </div>
  );
}
