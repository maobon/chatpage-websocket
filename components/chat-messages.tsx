import { User, UsersRound } from "lucide-react";
import type { ChatMessage } from "../hooks/use-websocket-chat";

type ChatMessagesProps = {
  messages: ChatMessage[];
};

export default function ChatMessages({ messages }: ChatMessagesProps) {
  return (
    <section
      aria-label="聊天消息"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8"
    >
      {messages.map((message) => (
        <article
          key={message.id}
          className={`flex items-start gap-3 ${
            message.role === "local" ? "flex-row-reverse" : ""
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              message.role === "remote"
                ? "bg-emerald-500 text-white"
                : "bg-slate-900 text-white"
            }`}
          >
            {message.role === "local" ? (
              <User size={18} />
            ) : (
              <UsersRound size={18} />
            )}
          </div>
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
              message.role === "remote"
                ? "rounded-tl-md border border-slate-200 bg-white"
                : "rounded-tr-md bg-slate-900 text-white"
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
