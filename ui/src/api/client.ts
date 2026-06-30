const BASE = "/api";

// Khi mở dashboard qua Cloudflare tunnel (gemops.gemcapitalholding.com), server
// bật remoteApiKeyGuard → request từ xa BẮT BUỘC header API key. localhost được miễn.
// Key nhập 1 lần (prompt) + lưu localStorage; KHÔNG hardcode secret trong bundle.
const REMOTE_KEY_STORAGE = "paperclip_remote_api_key";

function isRemoteHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  return h !== "" && h !== "localhost" && h !== "127.0.0.1" && h !== "::1";
}

function getRemoteApiKey(): string {
  try {
    return (localStorage.getItem(REMOTE_KEY_STORAGE) || "").trim();
  } catch {
    return "";
  }
}

export function setRemoteApiKey(key: string): void {
  try {
    localStorage.setItem(REMOTE_KEY_STORAGE, key.trim());
  } catch {
    /* ignore */
  }
}

function clearRemoteApiKey(): void {
  try {
    localStorage.removeItem(REMOTE_KEY_STORAGE);
  } catch {
    /* ignore */
  }
}

// Hỏi key 1 lần duy nhất (memoize) — tránh prompt-storm khi nhiều request song song lúc load.
let keyPromptInFlight: Promise<string> | null = null;
function promptRemoteKey(message: string): Promise<string> {
  if (typeof window === "undefined") return Promise.resolve("");
  if (!keyPromptInFlight) {
    keyPromptInFlight = Promise.resolve().then(() => {
      const entered = window.prompt(message, "");
      const k = (entered || "").trim();
      if (k) setRemoteApiKey(k);
      keyPromptInFlight = null;
      return k;
    });
  }
  return keyPromptInFlight;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit, _retried = false): Promise<T> {
  const headers = new Headers(init?.headers ?? undefined);
  const body = init?.body;
  if (!(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Truy cập từ xa: đính API key. Chưa có key → hỏi 1 lần trước khi gọi.
  if (isRemoteHost()) {
    let key = getRemoteApiKey();
    if (!key) key = await promptRemoteKey("Nhập Paperclip API key để truy cập dashboard từ xa:");
    if (key) headers.set("x-paperclip-api-key", key);
  }

  // headers đặt SAU ...init để key + Content-Type luôn được áp (không bị init.headers ghi đè).
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const message =
      (errorBody as { error?: string } | null)?.error ?? `Request failed: ${res.status}`;

    // Remote 401 do key thiếu/sai → xoá key cũ, hỏi lại 1 lần, retry.
    if (res.status === 401 && isRemoteHost() && !_retried && /API key/i.test(message)) {
      clearRemoteApiKey();
      const key = await promptRemoteKey("API key sai hoặc thiếu. Nhập lại Paperclip API key:");
      if (key) return request<T>(path, init, true);
    }

    throw new ApiError(message, res.status, errorBody);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
