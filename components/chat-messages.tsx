/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from "react";
import { MessageSquareText, User, UsersRound } from "lucide-react";
import type { ChatMessage } from "../hooks/use-websocket-chat";

type ChatMessagesProps = {
    messages: ChatMessage[];
};

export default function ChatMessages({ messages }: ChatMessagesProps) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (messages.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-slate-400">
                <div className="rounded-full bg-slate-100 p-6">
                    <MessageSquareText size={48} className="text-slate-300" />
                </div>
                <div className="text-center">
                    <p className="text-lg font-medium text-slate-600">欢迎来到 WebSocket 聊天室</p>
                    <p className="mt-1 text-sm">开始发送第一条消息吧！</p>
                </div>
            </div>
        );
    }

    function formatTime(timestamp: number) {
        return new Intl.DateTimeFormat("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(timestamp));
    }

    return (
        <section
            aria-label="聊天消息"
            className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8"
        >
            {messages.map((message) => {
                if (message.type === "system") {
                    return (
                        <div key={message.id} className="flex justify-center">
                            <span className="rounded-full bg-slate-200/50 px-3 py-1 text-[11px] font-medium text-slate-500">
                                {message.content}
                            </span>
                        </div>
                    );
                }

                return (
                    <article
                        key={message.id}
                        className={`flex items-start gap-3 ${message.role === "local" ? "flex-row-reverse" : ""
                            }`}
                    >
                        <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm ${message.role === "remote"
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
                            className={`flex max-w-[80%] flex-col gap-1 ${message.role === "local" ? "items-end" : "items-start"
                                }`}
                        >
                            <div
                                className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${message.role === "remote"
                                    ? "rounded-tl-md border border-slate-200 bg-white text-slate-800"
                                    : "rounded-tr-md bg-slate-900 text-white"
                                    }`}
                            >
                                {message.type === "text" ? (
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                ) : (
                                    <a
                                        href={message.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block overflow-hidden rounded-lg transition hover:opacity-90"
                                    >
                                        <img
                                            src={message.url}
                                            alt="图片消息"
                                            className="h-auto max-w-[35vw] object-contain"
                                        />
                                    </a>
                                )}
                            </div>
                            <time className="px-1 text-[10px] tracking-wider text-slate-400 uppercase">
                                {formatTime(message.timestamp)}
                            </time>
                        </div>
                    </article>
                );
            })}
            <div ref={endRef} />
        </section>
    );
}
