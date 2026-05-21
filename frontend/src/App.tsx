import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

// Route-level code-splitting: each page becomes its own chunk, so the initial
// bundle only ships the auth shell + layout. Unauthenticated visitors never
// download the logged-in pages.
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LogMeal = lazy(() => import("./pages/LogMeal"));
const LogWorkout = lazy(() => import("./pages/LogWorkout"));
const History = lazy(() => import("./pages/History"));
const Goals = lazy(() => import("./pages/Goals"));
const Profile = lazy(() => import("./pages/Profile"));
const Progress = lazy(() => import("./pages/Progress"));
const Plans = lazy(() => import("./pages/Plans"));

const queryClient = new QueryClient();

const RouteFallback = () => <div className="min-h-screen bg-background" />;

const ProtectedLayout = () => {
  const { user, planAdmin, loading } = useAuth();
  if (loading) return <RouteFallback />;
  if (!user && !planAdmin) return <Navigate to="/auth" replace />;
  return <AppLayout />;
};

const AuthGate = () => {
  const { user, planAdmin, loading } = useAuth();
  if (loading) return <RouteFallback />;
  if (planAdmin) return <Navigate to="/plans" replace />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Auth />;
};

const UserOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { planAdmin } = useAuth();
  if (planAdmin) return <Navigate to="/plans" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<AuthGate />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<UserOnlyRoute><Dashboard /></UserOnlyRoute>} />
              <Route path="/log-meal" element={<UserOnlyRoute><LogMeal /></UserOnlyRoute>} />
              <Route path="/log-workout" element={<UserOnlyRoute><LogWorkout /></UserOnlyRoute>} />
              <Route path="/history" element={<UserOnlyRoute><History /></UserOnlyRoute>} />
              <Route path="/goals" element={<UserOnlyRoute><Goals /></UserOnlyRoute>} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/progress" element={<UserOnlyRoute><Progress /></UserOnlyRoute>} />
              <Route path="/profile" element={<UserOnlyRoute><Profile /></UserOnlyRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
