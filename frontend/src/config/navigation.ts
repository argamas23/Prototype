import { ClipboardList, type LucideIcon, Dumbbell, History, LayoutDashboard, Target, TrendingUp, User, UtensilsCrossed } from "lucide-react";

export const APP_ROUTES = {
  auth: "/auth",
  dashboard: "/dashboard",
  logMeal: "/log-meal",
  logWorkout: "/log-workout",
  history: "/history",
  goals: "/goals",
  plans: "/plans",
  progress: "/progress",
  profile: "/profile",
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

export type NavigationItem = {
  label: string;
  to: AppRoute;
  icon: LucideIcon;
};

export const NAV_ITEMS: readonly NavigationItem[] = [
  { label: "Dashboard", to: APP_ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Log Meal", to: APP_ROUTES.logMeal, icon: UtensilsCrossed },
  { label: "Log Workout", to: APP_ROUTES.logWorkout, icon: Dumbbell },
  { label: "History", to: APP_ROUTES.history, icon: History },
  { label: "Goals", to: APP_ROUTES.goals, icon: Target },
  { label: "Plans", to: APP_ROUTES.plans, icon: ClipboardList },
  { label: "Progress", to: APP_ROUTES.progress, icon: TrendingUp },
  { label: "Profile", to: APP_ROUTES.profile, icon: User },
];

export const PLAN_ADMIN_NAV_ITEMS: readonly NavigationItem[] = NAV_ITEMS.filter(
  (item) => item.to === APP_ROUTES.plans,
);

export function getVisibleNavItems(isPlanAdmin: boolean): readonly NavigationItem[] {
  return isPlanAdmin ? PLAN_ADMIN_NAV_ITEMS : NAV_ITEMS;
}
