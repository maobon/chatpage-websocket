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
  parseAuthSession,
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
    if (!session || !token || isCached) return;

    const controller = new AbortController();

    verifyAuthSession(session, controller.signal)
      .then((isValid) => {
        if (isValid) {
          verifiedTokens.add(token);
          setVerifiedToken(token);
          setErrorToken(null);
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
