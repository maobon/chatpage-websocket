"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, VideoOff } from "lucide-react";
import Peer from "simple-peer";
import config from "../../config.json";
import { useAuth } from "../../hooks/useAuth";

/**
 * 格式化并解包 RTC 信令数据
 * 支持原始格式和 {"type":"rtc", "offer": "sdp..."} 嵌套格式
 */
function parseRtcSignal(rawData: unknown): Peer.SignalData | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = typeof rawData === "string" ? JSON.parse(rawData) : (rawData as any);

        // 1. 处理嵌套格式 {"type":"rtc", "offer":...}
        if (data.type === "rtc") {
            if (data.offer) {
                return typeof data.offer === "string" ? { type: "offer", sdp: data.offer } : data.offer;
            }
            if (data.answer) {
                return typeof data.answer === "string" ? { type: "answer", sdp: data.answer } : data.answer;
            }
            if (data.candidate) {
                // 确保 candidate 格式符合 SimplePeer 期待的 SignalData
                if (typeof data.candidate === "string") {
                    return {
                        type: "candidate",
                        candidate: {
                            candidate: data.candidate,
                            sdpMid: "0",
                            sdpMLineIndex: 0
                        }
                    } as Peer.SignalData;
                }
                return data.candidate as Peer.SignalData;
            }
            return null;
        }

        // 2. 处理原始 WebRTC/SimplePeer 格式
        // 只有包含 offer/answer 标识或 candidate 字段的才被视为有效信令
        if (data.type === "offer" || data.type === "answer" || data.candidate) {
            return data as Peer.SignalData;
        }

        // 3. 忽略其他非 WebRTC 报文（如聊天文本、系统消息等）
        return null;
    } catch {
        return null;
    }
}

export default function VideoCallPage() {
    const router = useRouter();
    const auth = useAuth();
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<Peer.Instance | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState<string>("正在初始化...");
    const [isConnected, setIsConnected] = useState(false);

    const initializePeer = useCallback((incomingSignal: Peer.SignalData) => {
        const peer = new Peer({
            initiator: false,
            trickle: true,
            config: { iceServers: config.iceServers },
        });

        peer.on("signal", (data) => {
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const signalAny = data as any;
                const message = data.type === "answer"
                    ? { type: "rtc", answer: signalAny.sdp || signalAny }
                    : { type: "rtc", candidate: signalAny.candidate || signalAny };

                socketRef.current.send(JSON.stringify(message));
            }
        });

        peer.on("stream", (stream) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
                setIsConnected(true);
                setStatus("通话中");
            }
        });

        peer.on("error", (err) => {
            console.error("WebRTC 错误:", err);
            setStatus(`连接错误: ${err.message}`);
            setIsConnected(false);
        });

        peer.on("close", () => {
            setIsConnected(false);
            setStatus("连接已断开");
        });

        // 监听 ICE 状态
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pc = (peer as any)._pc as RTCPeerConnection;
        if (pc) {
            pc.oniceconnectionstatechange = () => {
                const state = pc.iceConnectionState;
                if (state === "failed") setStatus("ICE 穿透失败");
            };
        }

        peer.signal(incomingSignal);
        peerRef.current = peer;
    }, []);

    useEffect(() => {
        if (auth.status === "checking") return;

        const baseWebsocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? config.defaultWebsocketUrl;
        const token = auth.session?.accessToken;
        const websocketUrl = token
            ? `${baseWebsocketUrl}${baseWebsocketUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
            : baseWebsocketUrl;

        const socket = new WebSocket(websocketUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            setStatus("已连接，等待呼叫...");

            // 处理来自主页的跳转队列
            const pending = sessionStorage.getItem("pending_rtc_signals");
            if (pending) {
                const signals = JSON.parse(pending) as unknown[];
                sessionStorage.removeItem("pending_rtc_signals");
                signals.forEach((sig) => {
                    socket.onmessage!({ data: JSON.stringify(sig) } as MessageEvent);
                });
            }
        };

        socket.onmessage = (event) => {
            try {
                const rawData = event.data;
                const signalData = parseRtcSignal(rawData);
                if (!signalData) return;

                if (!peerRef.current && signalData.type === "offer") {
                    initializePeer(signalData);
                } else if (peerRef.current) {
                    peerRef.current.signal(signalData);
                }
            } catch (err) {
                console.error("解析信令失败:", err);
            }
        };

        socket.onclose = () => setStatus("连接已断开");

        return () => {
            socket.close();
            if (peerRef.current) peerRef.current.destroy();
        };
    }, [auth.status, auth.session?.accessToken, initializePeer]);

    return (
        <main className="flex min-h-screen flex-col bg-slate-950 text-white p-4">
            <header className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-semibold">视频接听</h1>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                {!isConnected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-900/80 backdrop-blur-sm">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 animate-pulse">
                            <VideoOff size={40} className="text-slate-500" />
                        </div>
                        <p className="text-slate-400 font-medium">{status}</p>
                    </div>
                )}

                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover transition-opacity duration-700 ${isConnected ? "opacity-100" : "opacity-0"}`}
                />

                {isConnected && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 bg-slate-900/60 backdrop-blur rounded-full border border-white/10">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">正在接收远程视频...</span>
                    </div>
                )}
            </div>

            <footer className="mt-8 flex justify-center pb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-semibold transition-all active:scale-95 shadow-lg"
                >
                    <VideoOff size={20} />
                    挂断并返回
                </button>
            </footer>
        </main>
    );
}
