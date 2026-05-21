import { auth } from "@/lib/firebase";
import { getUserErrorMessage } from "@/lib/errors";
import { getPlanAdminSession } from "@/services/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export function getApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<unknown> {
  const headers = new Headers(options.headers || {});
  let authToken = token;
  if (!authToken && auth.currentUser) {
    authToken = await auth.currentUser.getIdToken();
  }
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  const planAdmin = getPlanAdminSession();
  if (planAdmin) {
    headers.set("X-Plan-Admin-Email", planAdmin.email);
    headers.set("X-Plan-Admin-Token", planAdmin.token);
  }
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const url = getApiUrl(path);
  const doFetch = (targetUrl: string) =>
    fetch(targetUrl, {
      ...options,
      headers,
    });

  const getFallbackUrls = (targetUrl: string): string[] => {
    const fallbacks: string[] = [];
    try {
      const parsed = new URL(targetUrl);
      if (parsed.hostname === "localhost" || parsed.hostname === "::1") {
        const loopback = new URL(parsed.toString());
        loopback.hostname = "127.0.0.1";
        fallbacks.push(loopback.toString());
      }
      if (parsed.hostname === "127.0.0.1") {
        const localhost = new URL(parsed.toString());
        localhost.hostname = "localhost";
        fallbacks.push(localhost.toString());
      }

      if (typeof window !== "undefined" && window.location.hostname) {
        const browserHost = window.location.hostname;
        if (browserHost !== parsed.hostname) {
          const browserHostUrl = new URL(parsed.toString());
          browserHostUrl.hostname = browserHost;
          fallbacks.push(browserHostUrl.toString());
        }
      }
    } catch {
      // ignore
    }
    return [...new Set(fallbacks)];
  };

  let response: Response | null = null;
  try {
    response = await doFetch(url);
  } catch (err) {
    const fallbackUrls = getFallbackUrls(url);
    for (const fallbackUrl of fallbackUrls) {
      try {
        response = await doFetch(fallbackUrl);
        if (response) break;
      } catch {
        // try next fallback URL, then fall through to helpful error message
      }
    }

    if (!response) {
      const isTypeError = err instanceof TypeError;
      const hint = isTypeError
        ? `Could not reach the API at ${API_BASE_URL}. Make sure the backend is running, and set VITE_API_BASE_URL to http://127.0.0.1:8000 (or run Uvicorn with --host ::), and ensure backend ALLOWED_ORIGINS matches your frontend URL.`
        : "Network request failed. Please try again.";
      throw new Error(hint);
    }

  }

  if (!response) {
    throw new Error("Network request failed. Please try again.");
  }

  const rawBody = await response.text();

  if (!response.ok) {
    let rawMessage = "";
    let errorCode: string | undefined;
    try {
      const json = rawBody
        ? (JSON.parse(rawBody) as {
            detail?: unknown;
            message?: unknown;
            error?: { code?: unknown; message?: unknown };
          })
        : null;
      // New envelope from DomainError handler: { error: { code, message } }
      if (json?.error && typeof json.error === "object") {
        if (typeof json.error.code === "string") errorCode = json.error.code;
        if (typeof json.error.message === "string") rawMessage = json.error.message;
      }
      if (!rawMessage) {
        if (typeof json?.detail === "string") rawMessage = json.detail;
        else if (typeof json?.message === "string") rawMessage = json.message;
        else rawMessage = rawBody;
      }
    } catch {
      rawMessage = rawBody;
    }
    const fallback = `Request failed (${response.status}). Please try again.`;
    const err = new Error(getUserErrorMessage(rawMessage, fallback)) as Error & {
      status?: number;
      code?: string;
    };
    err.status = response.status;
    err.code = errorCode;
    throw err;
  }

  if (response.status === 204 || !rawBody) {
    return null;
  }

  return JSON.parse(rawBody);
}
