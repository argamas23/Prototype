type FirebaseErrorLike = {
  code?: unknown;
  message?: unknown;
};

function getErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const code = (err as FirebaseErrorLike).code;
  return typeof code === "string" ? code : undefined;
}

function getErrorMessage(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  if (!err || typeof err !== "object") return undefined;
  const message = (err as FirebaseErrorLike).message;
  return typeof message === "string" ? message : undefined;
}

export function formatFirebaseAuthError(err: unknown): string {
  const code = getErrorCode(err);
  const message = getErrorMessage(err) ?? "Authentication failed.";

  const isApiKeyError =
    code === "auth/invalid-api-key" ||
    code === "auth/api-key-not-valid" ||
    message.includes("api-key-not-valid") ||
    message.includes("invalid-api-key");

  if (isApiKeyError) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return [
      "Firebase API key is missing/invalid or restricted.",
      "Fix: update `frontend/.env` with the Firebase *Web App* config (Project settings → Your apps).",
      "If you restricted the key in Google Cloud Console, allow the Identity Toolkit / Firebase Authentication API.",
      origin ? `If your API key has HTTP referrer restrictions, allow: ${origin}` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }

  const isUnauthorizedDomain =
    code === "auth/unauthorized-domain" || message.includes("unauthorized-domain");

  if (isUnauthorizedDomain) {
    const host = typeof window !== "undefined" ? window.location.host : "";
    return [
      "This domain isn't authorized for Firebase Auth.",
      "Fix: Firebase Console → Authentication → Settings → Authorized domains.",
      host ? `Add: ${host}` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return message;
}
