"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  clearAuthSession,
  getAuthSnapshot,
  getServerAuthSnapshot,
  normalizeAvatarUrl,
  parseAuthSession,
  saveAuthSession,
  subscribeToAuth,
  verifyAuthSession,
} from "../lib/auth";

export type AuthStatus =
  "checking" | "authenticated" | "unauthenticated" | "error";

// 内存缓存已验证通过的 Token，避免单次应用会话期间的重复验证请求。
const verifiedTokens = new Set<string>();

export function useAuthSession() {
  const snapshot = useSyncExternalStore(
    subscribeToAuth,
    getAuthSnapshot,
    getServerAuthSnapshot,
  );

  const session = useMemo(() => parseAuthSession(snapshot), [snapshot]);
  const token = session?.accessToken ?? null;

  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [errorToken, setErrorToken] = useState<string | null>(null);
  const [verificationAttempt, setVerificationAttempt] = useState(0);

  useEffect(() => {
    // 无法解析的旧数据或损坏数据不应长期留在浏览器中。
    if (snapshot && !session) clearAuthSession();
  }, [session, snapshot]);

  const isCached = useMemo(
    () => (token ? verifiedTokens.has(token) : false),
    [token],
  );

  useEffect(() => {
    // 即使 Token 已经缓存，如果 session 中没有头像，我们也应该验证一次以获取头像
    const needsAvatarSync = session && !session.avatar;
    if (!session || !token || (isCached && !needsAvatarSync)) {
      return;
    }

    const controller = new AbortController();

    verifyAuthSession(session, controller.signal)
      .then((data) => {
        // 打印服务端返回的内容，用于调试头像刷新问题
        console.log("useAuthSession: /me 接口完整返回内容:", data);

        if (data) {
          verifiedTokens.add(token);
          setVerifiedToken(token);
          setErrorToken(null);

          // 严格按照用户提供的结构解析: extra.avatar_url
          const extra = data?.extra;
          const serverAvatarUrl = extra && typeof extra === "object" ? extra.avatar_url : null;

          const finalAvatar = normalizeAvatarUrl(serverAvatarUrl);
          console.log(">>> 最终解析出的头像地址:", finalAvatar);

          if (session && finalAvatar && finalAvatar !== session.avatar) {
            console.log("useAuthSession: 头像不一致，更新本地 Session");
            saveAuthSession({ ...session, avatar: finalAvatar });
          }
          return;
        }

        // 服务端明确拒绝 JWT 时立即清除本地会话，避免继续使用失效令牌。
        clearAuthSession();
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError")
          return;
        setErrorToken(token);
      });

    return () => controller.abort();
  }, [session, token, verificationAttempt, isCached]);

  const retry = useCallback(() => {
    setErrorToken(null);
    setVerificationAttempt((current) => current + 1);
  }, []);

  let status: AuthStatus;

  if (!session || !token) {
    status = "unauthenticated";
  } else if (isCached || verifiedToken === token) {
    status = "authenticated";
  } else if (errorToken === token) {
    status = "error";
  } else {
    status = "checking";
  }

  return { retry, session, status };
}
