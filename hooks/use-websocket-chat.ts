"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const defaultWebsocketUrl = "ws://127.0.0.1:8000/ws";

export type ChatMessage =
    | {
        id: number;
        role: "local" | "remote";
        type: "text";
        content: string;
        timestamp: number;
    }
    | {
        id: number;
        role: "local" | "remote";
        type: "image";
        url: string;
        timestamp: number;
    }
    | {
        id: number;
        role: "remote";
        type: "system";
        content: string;
        timestamp: number;
    };

export type ProtocolMessage =
    | { type: "text"; content: string }
    | { type: "image"; url: string }
    | { type: "system"; content: string; timestamp?: string; sender?: string };

export type ConnectionStatus = "connecting" | "open" | "closed" | "error";

export function useWebsocketChat(enabled: boolean, token?: string) {
    const baseWebsocketUrl =
        process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? defaultWebsocketUrl;

    const websocketUrl = token
        ? `${baseWebsocketUrl}${baseWebsocketUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
        : baseWebsocketUrl;
    const socketRef = useRef<WebSocket | null>(null);
    const nextMessageId = useRef(1);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [status, setStatus] = useState<ConnectionStatus>("connecting");
    const [connectionAttempt, setConnectionAttempt] = useState(0);
    const [error, setError] = useState("");
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const backoffFactor = useRef(0);

    useEffect(() => {
        // JWT 尚未通过服务端验证时不建立聊天连接。
        if (!enabled) return;

        let disposed = false;
        let socket: WebSocket;

        const connect = () => {
            if (disposed) return;

            try {
                socket = new WebSocket(websocketUrl);
                socketRef.current = socket;
            } catch {
                setStatus("error");
                setError("聊天服务地址无效。");
                return;
            }

            socket.addEventListener("open", () => {
                if (disposed) return;
                setStatus("open");
                setError("");
                backoffFactor.current = 0; // 连接成功，重置退避系数
            });

            socket.addEventListener("message", (event) => {
                if (disposed) return;

                let parsed: ProtocolMessage;
                try {
                    parsed = JSON.parse(String(event.data));
                    if (!parsed.type || !["text", "image", "system"].includes(parsed.type)) {
                        throw new Error("Invalid format");
                    }
                } catch {
                    parsed = { type: "text", content: String(event.data) };
                }

                // 处理系统消息可能带有的字符串时间戳
                const msgTimestamp = (parsed.type === "system" && parsed.timestamp)
                    ? new Date(parsed.timestamp).getTime()
                    : Date.now();

                setMessages((current) => [
                    ...current,
                    {
                        id: nextMessageId.current++,
                        role: "remote",
                        timestamp: isNaN(msgTimestamp) ? Date.now() : msgTimestamp,
                        ...parsed,
                    } as ChatMessage,
                ]);
            });

            socket.addEventListener("error", () => {
                if (disposed) return;
                setStatus("error");
            });

            socket.addEventListener("close", () => {
                if (disposed) return;
                setStatus("closed");

                // 指数退避重连逻辑
                const delay = Math.min(1000 * Math.pow(2, backoffFactor.current), 30000);
                backoffFactor.current++;

                reconnectTimeoutRef.current = setTimeout(() => {
                    if (!disposed) connect();
                }, delay);
            });
        };

        connect();

        // React 严格模式和页面切换都可能触发清理，必须关闭旧连接，
        // 否则同一页面会留下多个在线客户端并重复接收广播。
        return () => {
            disposed = true;
            if (socket) socket.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            socketRef.current = null;
        };
    }, [connectionAttempt, enabled, websocketUrl]);

    const sendMessage = useCallback((content: string) => {
        const socket = socketRef.current;
        const normalizedContent = content.trim();

        if (!normalizedContent || !socket || socket.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            const message: ProtocolMessage = { type: "text", content: normalizedContent };
            socket.send(JSON.stringify(message));
        } catch {
            setStatus("error");
            setError("消息发送失败，请重新连接后再试。");
            return false;
        }

        setMessages((current) => [
            ...current,
            {
                id: nextMessageId.current++,
                role: "local",
                type: "text",
                content: normalizedContent,
                timestamp: Date.now(),
            },
        ]);
        setError("");
        return true;
    }, []);

    const sendImage = useCallback((url: string) => {
        const socket = socketRef.current;

        if (!url || !socket || socket.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            const message: ProtocolMessage = { type: "image", url };
            socket.send(JSON.stringify(message));
        } catch {
            setStatus("error");
            setError("图片消息发送失败，请重新连接后再试。");
            return false;
        }

        setMessages((current) => [
            ...current,
            {
                id: nextMessageId.current++,
                role: "local",
                type: "image",
                url,
                timestamp: Date.now(),
            },
        ]);
        setError("");
        return true;
    }, []);

    const reconnect = useCallback(() => {
        setStatus("connecting");
        setError("");
        setConnectionAttempt((current) => current + 1);
    }, []);

    return {
        error,
        messages,
        reconnect,
        sendMessage,
        sendImage,
        status,
        websocketUrl,
    };
}
