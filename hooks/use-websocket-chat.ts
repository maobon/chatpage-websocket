"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const defaultWebsocketUrl = "ws://localhost:8002/ws";

export type ChatMessage = {
  id: number;
  role: "local" | "remote";
  content: string;
};

export type ConnectionStatus = "connecting" | "open" | "closed" | "error";

export function useWebsocketChat(enabled: boolean) {
  const websocketUrl =
    process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? defaultWebsocketUrl;
  const socketRef = useRef<WebSocket | null>(null);
  const nextMessageId = useRef(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    // JWT 尚未通过服务端验证时不建立聊天连接。
    if (!enabled) return;

    let disposed = false;
    let socket: WebSocket;

    try {
      socket = new WebSocket(websocketUrl);
    } catch {
      // 配置非法或浏览器拒绝连接时，避免异常穿透导致整个聊天页崩溃。
      queueMicrotask(() => {
        if (disposed) return;
        setStatus("error");
        setError("聊天服务地址无效或连接被浏览器阻止。");
      });

      return () => {
        disposed = true;
      };
    }

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      if (!disposed) setStatus("open");
    });

    socket.addEventListener("message", (event) => {
      if (disposed) return;

      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          role: "remote",
          content: String(event.data),
        },
      ]);
    });

    socket.addEventListener("error", () => {
      if (disposed) return;
      setStatus("error");
      setError("无法连接聊天服务，请确认服务端已启动。");
    });

    socket.addEventListener("close", () => {
      if (!disposed) setStatus("closed");
    });

    // React 严格模式和页面切换都可能触发清理，必须关闭旧连接，
    // 否则同一页面会留下多个在线客户端并重复接收广播。
    return () => {
      disposed = true;
      socket.close();
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
      socket.send(normalizedContent);
    } catch {
      setStatus("error");
      setError("消息发送失败，请重新连接后再试。");
      return false;
    }

    // 服务端只向其他客户端广播，不会回显给发送者，
    // 因而本地消息需要在发送成功后立即加入列表。
    setMessages((current) => [
      ...current,
      {
        id: nextMessageId.current++,
        role: "local",
        content: normalizedContent,
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
    status,
    websocketUrl,
  };
}
