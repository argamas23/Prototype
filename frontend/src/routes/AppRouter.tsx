import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { APP_ROUTES } from "@/config/navigation";

const Auth = lazy(() => import("../pages/Auth"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const LogMeal = lazy(() => import("../pages/LogMeal"));
const LogWorkout = lazy(() => import("../pages/LogWorkout"));
const History = lazy(() => import("../pages/History"));
const Goals = lazy(() => import("../pages/Goals"));
const Profile = lazy(() => import("../pages/Profile"));
const Progress = lazy(() => import("../pages/Progress"));
const Plans = lazy(() => import("../pages/Plans"));

const RouteFallback = () => <div className="min-h-screen bg-background" />;

function ProtectedLayout() {
  const { user, planAdmin, loading } = useAuth();

  if (loading) return <RouteFallback />;
  if (!user && !planAdmin) return <Navigate to={APP_ROUTES.auth} replace />;

  return <AppLayout />;
}

function AuthGate() {
  const { user, planAdmin, loading } = useAuth();

  if (loading) return <RouteFallback />;
  if (planAdmin) return <Navigate to={APP_ROUTES.plans} replace />;
  if (user) return <Navigate to={APP_ROUTES.dashboard} replace />;

  return <Auth />;
}

function UserOnlyRoute({ children }: { children: ReactNode }) {
  const { planAdmin } = useAuth();

  if (planAdmin) return <Navigate to={APP_ROUTES.plans} replace />;
  return <>{children}</>;
}

type AppRouteDefinition = {
  path: string;
  element: ReactNode;
  userOnly?: boolean;
};

const APP_ROUTE_DEFINITIONS: readonly AppRouteDefinition[] = [
  { path: APP_ROUTES.dashboard, element: <Dashboard />, userOnly: true },
  { path: APP_ROUTES.logMeal, element: <LogMeal />, userOnly: true },
  { path: APP_ROUTES.logWorkout, element: <LogWorkout />, userOnly: true },
  { path: APP_ROUTES.history, element: <History />, userOnly: true },
  { path: APP_ROUTES.goals, element: <Goals />, userOnly: true },
  { path: APP_ROUTES.plans, element: <Plans /> },
  { path: APP_ROUTES.progress, element: <Progress />, userOnly: true },
  { path: APP_ROUTES.profile, element: <Profile />, userOnly: true },
];

function renderRoute({ path, element, userOnly }: AppRouteDefinition) {
  const routeElement = userOnly ? <UserOnlyRoute>{element}</UserOnlyRoute> : element;
  return <Route key={path} path={path} element={routeElement} />;
}

export function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to={APP_ROUTES.auth} replace />} />
        <Route path={APP_ROUTES.auth} element={<AuthGate />} />
        <Route element={<ProtectedLayout />}>
          {APP_ROUTE_DEFINITIONS.map(renderRoute)}
        </Route>
        <Route path="*" element={<Navigate to={APP_ROUTES.auth} replace />} />
      </Routes>
    </Suspense>
  );
}
