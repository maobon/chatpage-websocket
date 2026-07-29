"use client";

import { useRef, useState, ChangeEvent, useEffect } from "react";
import { X, Upload, Check, Loader2 } from "lucide-react";
import { AuthSession, saveAuthSession, chatApiUrl } from "../lib/auth";

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 清理 Object URL 避免内存泄漏
  useEffect(() => {
    return () => {
      if (selectedImage && selectedImage.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 移除旧的预览图并释放内存
      if (selectedImage && selectedImage.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImage);
      }

      const objectUrl = URL.createObjectURL(file);
      setSelectedImage(objectUrl);
    }
  };

  const handleSave = () => {
    if (!selectedImage || !canvasRef.current) return;

    setIsProcessing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = async () => {
      const size = Math.min(img.width, img.height);
      const startX = (img.width - size) / 2;
      const startY = (img.height - size) / 2;

      canvas.width = 100;
      canvas.height = 100;

      if (ctx) {
        ctx.drawImage(
          img,
          startX,
          startY,
          size,
          size, // source
          0,
          0,
          100,
          100 // destination
        );

        canvas.toBlob(async (blob) => {
          if (!blob) {
            setIsProcessing(false);
            return;
          }

          const formData = new FormData();
          formData.append("file", blob, "avatar.jpg");

          try {
            const response = await fetch(`${chatApiUrl}/upload/pic`, {
              method: "POST",
              headers: {
                Authorization: `${authSession.tokenType} ${authSession.accessToken}`,
                head_pic: "true",
              },
              body: formData,
            });

            if (!response.ok) throw new Error("上传失败");

            const data = await response.json();
            console.log("AvatarModal: upload response data:", data);

            // 兼容多种可能的返回字段
            const avatarUrl = data.url || data.avatar_url || data.avatar || data.data?.url;

            if (avatarUrl) {
              console.log("AvatarModal: updating session with uploaded avatar url:", avatarUrl);
              saveAuthSession({
                ...authSession,
                avatar: avatarUrl,
              });
              onClose();
              setSelectedImage(null);
            }
          } catch (error) {
            // 静默处理或可以考虑添加一个本地错误状态提示用户
          } finally {
            setIsProcessing(false);
          }
        }, "image/jpeg", 0.8);
      }
    };
    img.src = selectedImage;
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-slate-900">设置个人头像</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-500 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center justify-center">
            {selectedImage ? (
              <div className="relative group">
                <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner relative">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg hover:bg-rose-600 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-48 h-48 rounded-full border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition-all bg-slate-50/50"
              >
                <Upload size={32} strokeWidth={1.5} />
                <span className="text-sm font-medium">点击上传图片</span>
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <p className="text-xs text-center text-slate-500">
            建议上传正方形图片，系统会自动截取中心区域作为头像。
          </p>
        </div>

        <div className="flex items-center gap-3 p-4 bg-slate-50 border-t">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 text-sm font-medium text-slate-600 hover:bg-white hover:shadow-sm rounded-xl transition"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedImage || isProcessing}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium bg-slate-950 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md"
          >
            {isProcessing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Check size={16} />
                确认保存
              </>
            )}
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
