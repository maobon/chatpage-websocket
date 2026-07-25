const defaultApiUrl = "http://117.72.96.233:8000";

export const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL?.trim() || defaultApiUrl
).replace(/\/+$/, "");

const authStorageKey = "chat_auth_session_v1";
const authChangeEvent = "chat-auth-change";

export type AuthSession = {
  accessToken: string;
  tokenType: string;
  username: string;
};

type Credentials = {
  username: string;
  password: string;
};

function normalizeTokenType(tokenType: string) {
  // 认证服务返回小写 bearer，但其 JWT 中间件仅接受标准写法 Bearer。
  return tokenType.toLowerCase() === "bearer" ? "Bearer" : tokenType;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

// FastAPI 既可能返回字符串 detail，也可能返回 Pydantic 校验错误数组。
function getErrorMessage(error: unknown, fallback: string) {
  if (!isRecord(error)) return fallback;
  if (typeof error.detail === "string") return error.detail;
  if (typeof error.message === "string") return error.message;

  if (Array.isArray(error.detail)) {
    const messages = error.detail
      .map((item) =>
        isRecord(item) && typeof item.msg === "string" ? item.msg : null,
      )
      .filter((message): message is string => Boolean(message));

    if (messages.length) return messages.join("；");
  }

  return fallback;
}

async function post(path: string, credentials: Credentials) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, `请求失败（${response.status}）`));
  }

  return data;
}

export async function login(credentials: Credentials) {
  const token = await post("/login", credentials);

  if (
    !isRecord(token) ||
    typeof token.access_token !== "string" ||
    !token.access_token.trim() ||
    typeof token.token_type !== "string" ||
    !token.token_type.trim()
  ) {
    throw new Error("登录接口未返回有效的 access token。");
  }

  return {
    accessToken: token.access_token,
    tokenType: normalizeTokenType(token.token_type),
    username: credentials.username,
  } satisfies AuthSession;
}

export async function register(credentials: Credentials) {
  await post("/register", credentials);
}

export async function verifyAuthSession(
  session: AuthSession,
  signal?: AbortSignal,
) {
  const response = await fetch(`${apiUrl}/me`, {
    headers: {
      Authorization: `${normalizeTokenType(session.tokenType)} ${session.accessToken}`,
    },
    signal,
  });

  if (response.ok) return true;
  // 当前服务会用 422 表示 JWT 无法解析，和 401/403 一样视为会话失效。
  if ([401, 403, 422].includes(response.status)) return false;

  throw new Error(`登录状态验证失败（${response.status}）`);
}

export function saveAuthSession(session: AuthSession) {
  // 当前前端直接请求认证 API，因此在浏览器端持久化 access token。
  // 若后续加入同源 BFF，建议改为由服务端写入 HttpOnly Cookie。
  localStorage.setItem(authStorageKey, JSON.stringify(session));
  window.dispatchEvent(new Event(authChangeEvent));
}

export function clearAuthSession() {
  localStorage.removeItem(authStorageKey);
  window.dispatchEvent(new Event(authChangeEvent));
}

export function getAuthSnapshot() {
  return localStorage.getItem(authStorageKey);
}

export function getServerAuthSnapshot() {
  return null;
}

export function subscribeToAuth(callback: () => void) {
  // storage 事件不会通知发起修改的当前标签页，自定义事件用于补齐同页同步。
  window.addEventListener(authChangeEvent, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(authChangeEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<AuthSession>;
  return (
    typeof session.accessToken === "string" &&
    Boolean(session.accessToken.trim()) &&
    typeof session.tokenType === "string" &&
    Boolean(session.tokenType.trim()) &&
    typeof session.username === "string" &&
    Boolean(session.username.trim())
  );
}

export function parseAuthSession(value: string | null) {
  if (!value) return null;

  try {
    const session: unknown = JSON.parse(value);
    return isAuthSession(session) ? session : null;
  } catch {
    return null;
  }
}
