import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <AppSidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
      />
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${sidebarCollapsed ? "md:ml-16" : "md:ml-56"}`}>
        <Button
          variant="outline"
          size="icon"
          className="md:hidden fixed top-4 left-4 z-50 shadow"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <main className="flex-1 p-4 md:p-6 overflow-auto min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
