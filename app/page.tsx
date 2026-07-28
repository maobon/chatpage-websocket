"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGate from "../components/auth-gate";
import ChatComposer from "../components/chat-composer";
import ChatHeader from "../components/chat-header";
import ChatMessages from "../components/chat-messages";
import { useAuthSession } from "../hooks/use-auth-session";
import { useWebsocketChat } from "../hooks/use-websocket-chat";

export default function ChatPage() {
    const router = useRouter();
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [input, setInput] = useState("");
    const auth = useAuthSession();
    const isAuthenticated = auth.status === "authenticated";
    const chat = useWebsocketChat(isAuthenticated);

    useEffect(() => {
        if (auth.status === "unauthenticated") {
            router.replace("/login");
        }
    }, [auth.status, router]);

    if (auth.status !== "authenticated") {
        return <AuthGate authStatus={auth.status} onRetry={auth.retry} />;
    }

    // authenticated 状态按设计必然携带会话；这里保留保护分支，避免异常状态渲染聊天页。
    if (!auth.session) {
        return <AuthGate authStatus="checking" onRetry={auth.retry} />;
    }

    return (
        <main className="flex min-h-screen flex-col bg-slate-50 pb-40 text-slate-950">
            <ChatHeader
                authSession={auth.session}
                connectionStatus={chat.status}
                onReconnect={chat.reconnect}
            />
            <ChatMessages messages={chat.messages} />
            <ChatComposer
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
