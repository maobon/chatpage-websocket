"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../components/AuthGuard";
import ChatInput from "../components/ChatInput";
import ChatHeader from "../components/ChatHeader";
import ChatList from "../components/ChatList";
import { useAuth } from "../hooks/useAuth";
import { useChat, ProtocolMessage } from "../hooks/useChat";

export default function ChatPage() {
    const router = useRouter();
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [input, setInput] = useState("");
    const auth = useAuth();
    const isAuthenticated = auth.status === "authenticated";

    const handleRtcMessage = useCallback((msg: ProtocolMessage) => {
        if (msg.type !== "rtc") return;

        // 过滤掉自己发送的信号
        if (msg.sender === auth.session?.username) {
            return;
        }

        // 使用数组存储信号，防止在跳转过程中丢失后续的 ICE candidate
        const pendingSignals = JSON.parse(sessionStorage.getItem("pending_rtc_signals") || "[]");
        pendingSignals.push(msg);
        sessionStorage.setItem("pending_rtc_signals", JSON.stringify(pendingSignals));

        if (msg.offer) {
            // 如果已经在接听页面，不需要重复跳转
            if (window.location.pathname !== "/video-call") {
                router.push("/video-call");
            }
        }
    }, [router, auth.session?.username]);

    const chat = useChat(isAuthenticated, auth.session?.accessToken, auth.session?.avatar, handleRtcMessage);

    useEffect(() => {
        if (auth.status === "unauthenticated") {
            router.replace("/login");
        }
    }, [auth.status, router]);

    if (auth.status !== "authenticated") {
        return <AuthGuard authStatus={auth.status} onRetry={auth.retry} />;
    }

    // authenticated 状态按设计必然携带会话；这里保留保护分支，避免异常状态渲染聊天页。
    if (!auth.session) {
        return <AuthGuard authStatus="checking" onRetry={auth.retry} />;
    }

    return (
        <main className="flex min-h-screen flex-col bg-slate-50 pb-40 text-slate-950">
            <ChatHeader
                authSession={auth.session}
                connectionStatus={chat.status}
                onReconnect={chat.reconnect}
            />
            <ChatList messages={chat.messages} authSession={auth.session} />
            <ChatInput
                authSession={auth.session}
                connectionStatus={chat.status}
                error={chat.error}
                input={input}
                inputRef={inputRef}
                onInputChange={setInput}
                onSend={chat.sendMessage}
                onSendImage={chat.sendImage}
                websocketUrl={chat.websocketUrl}
            />
        </main>
    );
}
