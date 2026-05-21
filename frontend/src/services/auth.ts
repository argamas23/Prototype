import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export const PLAN_ADMIN_EMAIL = "planAdmin@gmail.com";
const PLAN_ADMIN_PASSWORD = "12341234";
export const PLAN_ADMIN_TOKEN = "healthsync-plan-admin";
const PLAN_ADMIN_STORAGE_KEY = "healthsync.planAdmin";
export const PLAN_ADMIN_SESSION_EVENT = "healthsync-plan-admin-session";

export type PlanAdminSession = {
  email: typeof PLAN_ADMIN_EMAIL;
  token: typeof PLAN_ADMIN_TOKEN;
};

export function isPlanAdminCredentials(email: string, password: string): boolean {
  return email.trim() === PLAN_ADMIN_EMAIL && password === PLAN_ADMIN_PASSWORD;
}

export function getPlanAdminSession(): PlanAdminSession | null {
  try {
    const raw = window.localStorage.getItem(PLAN_ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlanAdminSession;
    if (parsed.email === PLAN_ADMIN_EMAIL && parsed.token === PLAN_ADMIN_TOKEN) return parsed;
  } catch {
    return null;
  }
  return null;
}

export function signInPlanAdmin(): PlanAdminSession {
  const session: PlanAdminSession = { email: PLAN_ADMIN_EMAIL, token: PLAN_ADMIN_TOKEN };
  window.localStorage.setItem(PLAN_ADMIN_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(PLAN_ADMIN_SESSION_EVENT));
  return session;
}

export function clearPlanAdminSession(): void {
  window.localStorage.removeItem(PLAN_ADMIN_STORAGE_KEY);
  window.dispatchEvent(new Event(PLAN_ADMIN_SESSION_EVENT));
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  clearPlanAdminSession();
  await signOut(auth);
}
