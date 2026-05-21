import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { browserSessionPersistence, onAuthStateChanged, setPersistence } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getPlanAdminSession,
  PLAN_ADMIN_SESSION_EVENT,
  signOutUser,
  type PlanAdminSession,
} from "@/services/auth";

type AuthContextValue = {
  user: User | null;
  planAdmin: PlanAdminSession | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [planAdmin, setPlanAdmin] = useState<PlanAdminSession | null>(() => getPlanAdminSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const refreshPlanAdmin = () => setPlanAdmin(getPlanAdminSession());

    const init = async () => {
      try {
        await setPersistence(auth, browserSessionPersistence);
      } catch {
        // Continue with default persistence
      }
      unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        refreshPlanAdmin();
        setLoading(false);
      });
    };

    window.addEventListener(PLAN_ADMIN_SESSION_EVENT, refreshPlanAdmin);
    void init();
    return () => {
      window.removeEventListener(PLAN_ADMIN_SESSION_EVENT, refreshPlanAdmin);
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, planAdmin, loading, signOut: signOutUser }),
    [user, planAdmin, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
