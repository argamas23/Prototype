import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Dumbbell,
  History,
  Target,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  User,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Log Meal", to: "/log-meal", icon: UtensilsCrossed },
  { label: "Log Workout", to: "/log-workout", icon: Dumbbell },
  { label: "History", to: "/history", icon: History },
  { label: "Goals", to: "/goals", icon: Target },
  { label: "Plans", to: "/plans", icon: ClipboardList },
  { label: "Progress", to: "/progress", icon: TrendingUp },
  { label: "Profile", to: "/profile", icon: User },
];

export function AppSidebar({
  mobileOpen = false,
  onClose,
  collapsed = false,
  onToggleCollapsed,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const location = useLocation();
  const { user, planAdmin, signOut } = useAuth();
  const visibleNavItems = planAdmin ? navItems.filter((item) => item.to === "/plans") : navItems;

  const initials = user?.displayName
    ? user.displayName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email ?? planAdmin?.email)?.slice(0, 2).toUpperCase() ?? "?";

  const renderItem = (item: (typeof navItems)[0]) => {
    const active = location.pathname === item.to;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={() => mobileOpen && onClose?.()}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          collapsed && "justify-center px-2",
        )}
      >
        <item.icon className="h-4.5 w-4.5 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    );
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "flex flex-col border-r border-sidebar-border bg-sidebar h-screen transition-all duration-200 z-50",
          "fixed inset-y-0 left-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-56",
          "w-64",
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center h-14 px-4 shrink-0", collapsed && "justify-center px-2")}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <Activity className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-foreground tracking-tight">HealthSync</span>
            </div>
          )}
          {collapsed && (
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>

        <Separator className="bg-sidebar-border" />

        <nav className="flex-1 flex flex-col gap-0.5 p-2 overflow-y-auto">
          {visibleNavItems.map(renderItem)}
        </nav>

        <Separator className="bg-sidebar-border" />

        <nav className="flex flex-col gap-0.5 p-2">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-primary">{initials}</span>
            </div>
            {!collapsed && (
              <span className="truncate">{user?.displayName || user?.email || planAdmin?.email || "User"}</span>
            )}
          </div>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/10",
              collapsed && "justify-center px-2",
            )}
            onClick={signOut}
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </Button>
        </nav>

        <div className="p-2 hidden md:block">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full rounded-lg justify-center text-sidebar-foreground hover:bg-sidebar-accent",
              !collapsed && "justify-end",
            )}
            onClick={onToggleCollapsed}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>
    </>
  );
}
