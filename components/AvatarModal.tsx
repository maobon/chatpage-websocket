/* eslint-disable @next/next/no-img-element */
import { ChangeEvent, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { AuthSession, chatApiUrl, saveAuthSession } from "../lib/auth";

type AvatarModalProps = {
  isOpen: boolean;
  onClose: () => void;
  authSession: AuthSession;
};

export default function AvatarModal({
  isOpen,
  onClose,
  authSession,
}: AvatarModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [currentAvatar, setCurrentAvatar] = useState(authSession.avatar || "");

  if (!isOpen) return null;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("图片大小不能超过 2MB。");
      return;
    }

    setError("");
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${chatApiUrl}/upload/avatar`, {
        method: "POST",
        headers: {
          Authorization: `${authSession.tokenType} ${authSession.accessToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "上传失败");
      }

      if (data.url) {
        const newAvatar = data.url;
        saveAuthSession({ ...authSession, avatar: newAvatar });
        setCurrentAvatar(newAvatar);
        setTimeout(onClose, 1000); // 成功后延迟关闭，让用户看到变化
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传头像出错");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition"
        >
          <X size={20} />
        </button>

        <h2 className="mb-2 text-xl font-bold text-slate-900 text-center">修改个人头像</h2>
        <p className="mb-8 text-sm text-slate-500 text-center">
          上传一张新图片作为你的聊天头像
        </p>

        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-slate-50 bg-slate-100 shadow-inner">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt="Current Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <Camera size={48} />
                </div>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg transition hover:bg-slate-800 active:scale-90 disabled:bg-slate-400"
            >
              {isUploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Camera size={18} />
              )}
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />

          {error && (
            <p className="mt-6 text-sm text-rose-600 bg-rose-50 px-4 py-2 rounded-xl w-full text-center">
              {error}
            </p>
          )}

          <button
            onClick={onClose}
            className="mt-8 w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95"
          >
            关闭窗口
          </button>
        </div>
      </div>
    </div>
  );
}
