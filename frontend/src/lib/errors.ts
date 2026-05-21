const AUTH_ERROR_MAP: Array<[RegExp, string]> = [
  [/auth\/invalid-credential/i, "Invalid email or password."],
  [/auth\/wrong-password/i, "Invalid email or password."],
  [/auth\/user-not-found/i, "Invalid email or password."],
  [/auth\/email-already-in-use/i, "This email is already in use."],
  [/auth\/weak-password/i, "Password is too weak."],
  [/auth\/popup-closed-by-user/i, "Sign-in popup was closed. Please try again."],
  [/auth\/popup-blocked/i, "Popup was blocked. Allow popups and try again."],
  [/auth\/network-request-failed/i, "Network error. Please try again."],
  [/auth\/too-many-requests/i, "Too many attempts. Please try again later."],
  [/auth\/requires-recent-login/i, "Please sign in again and retry this action."],
];

function cleanPrefix(message: string): string {
  return message
    .replace(/^error:\s*/i, "")
    .replace(/^firebase:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeMessage(message: string, fallback: string): string {
  const raw = cleanPrefix(message);
  const lower = raw.toLowerCase();
  if (!raw) return fallback;
  if (raw.startsWith("<!doctype") || raw.startsWith("<html")) return fallback;
  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return "Network error. Please try again.";
  }
  if (lower.includes("timeout")) {
    return "Request timed out. Please try again.";
  }
  for (const [pattern, mapped] of AUTH_ERROR_MAP) {
    if (pattern.test(raw)) return mapped;
  }
  if (
    lower.includes("firebase") ||
    lower.includes("googleapi") ||
    lower.includes("traceback") ||
    lower.includes("grpc") ||
    lower.includes("exception")
  ) {
    return fallback;
  }
  return raw;
}

export function getUserErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (typeof error === "string") {
    const trimmed = error.trim();
    if (!trimmed) return fallback;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && "detail" in parsed) {
        const detail = (parsed as { detail?: unknown }).detail;
        if (typeof detail === "string") return sanitizeMessage(detail, fallback);
      }
    } catch {
      // non-JSON string
    }
    return sanitizeMessage(trimmed, fallback);
  }

  if (error instanceof Error) {
    return sanitizeMessage(error.message, fallback);
  }
  return fallback;
}

