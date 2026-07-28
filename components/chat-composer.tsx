/* eslint-disable jsx-a11y/alt-text */
import {
    ChangeEvent,
    useEffect,
    FormEvent,
    KeyboardEvent,
    RefObject,
    useRef,
    useState,
} from "react";
import { Image, Loader2, SendHorizontal } from "lucide-react";
import type { ConnectionStatus } from "../hooks/use-websocket-chat";
import { chatApiUrl, AuthSession } from "../lib/auth";

type ChatComposerProps = {
    authSession: AuthSession;
    connectionStatus: ConnectionStatus;
    error: string;
    input: string;
    inputRef: RefObject<HTMLTextAreaElement | null>;
    onInputChange: (value: string) => void;
    onSend: (content: string) => boolean;
    onSendImage: (url: string) => boolean;
    websocketUrl: string;
};

export default function ChatComposer({
    authSession,
    connectionStatus,
    error: chatError,
    input,
    inputRef,
    onInputChange,
    onSend,
    onSendImage,
    websocketUrl,
}: ChatComposerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [localError, setLocalError] = useState("");

    const displayError = localError || chatError;

    // 自动调整输入框高度
    useEffect(() => {
        const textarea = inputRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [input, inputRef]);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (onSend(input)) {
            onInputChange("");
            setLocalError("");
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
        }
    }

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        // 清空 input 保证同名文件可重复选择
        event.target.value = "";

        // 校验文件大小 (2MB)
        if (file.size > 2 * 1024 * 1024) {
            setLocalError("图片大小不能超过 2MB。");
            return;
        }

        // 校验文件类型
        if (!file.type.startsWith("image/")) {
            setLocalError("只支持上传图片文件。");
            return;
        }

        setLocalError("");
        setIsUploading(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(`${chatApiUrl}/upload/pic`, {
                method: "POST",
                headers: {
                    Authorization: `${authSession.tokenType} ${authSession.accessToken}`,
                },
                body: formData,
            });

            const data = await response.json().catch(() => ({ message: "服务器返回非 JSON 错误" }));

            if (!response.ok) {
                throw new Error(
                    (typeof data.detail === "string" ? data.detail : null) ||
                    data.message ||
                    `上传失败 (${response.status})`
                );
            }

            if (data.url) {
                onSendImage(data.url);
            } else {
                throw new Error("服务端未返回图片 URL");
            }
        } catch (err) {
            setLocalError(err instanceof Error ? err.message : "图片上传出错");
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div className="fixed inset-x-0 bottom-0 bg-linear-to-t from-slate-50 via-slate-50 to-transparent px-5 pt-10 pb-5">
            {displayError && (
                <p className="mx-auto mb-2 max-w-3xl text-center text-xs text-rose-600">
                    {displayError}
                </p>
            )}
            <div className="mx-auto flex w-full max-w-3xl items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/60">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
                <button
                    type="button"
                    aria-label="上传图片"
                    disabled={isUploading || connectionStatus !== "open"}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isUploading ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <Image size={20} />
                    )}
                </button>

                <form onSubmit={handleSubmit} className="flex flex-1 items-end gap-3">
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
            </div>
            <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-slate-400">
                {connectionStatus === "open"
                    ? "消息将广播给其他在线客户端。"
                    : `等待连接 ${websocketUrl}`}
            </p>
        </div>
    );
}
