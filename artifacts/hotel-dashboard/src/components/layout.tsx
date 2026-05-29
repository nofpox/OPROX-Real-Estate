import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Calendar, DoorOpen, Menu, Users, Building2,
  BarChart3, Wrench, UserCog, ClipboardList, ChevronDown, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification-bell";
import { useRole, ROLES, type AppRole } from "@/contexts/role-context";

const ALL_NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, section: "main" },
  { href: "/bookings", label: "Bookings", icon: Calendar, section: "main" },
  { href: "/properties", label: "Properties", icon: Building2, section: "main" },
  { href: "/rooms", label: "Rooms", icon: DoorOpen, section: "main" },
  { href: "/guests", label: "Guests", icon: Users, section: "main" },
  { href: "/finance", label: "Finance", icon: BarChart3, section: "operations" },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, section: "operations" },
  { href: "/staff", label: "Staff", icon: UserCog, section: "operations" },
  { href: "/tasks", label: "Tasks", icon: ClipboardList, section: "operations" },
];

const ROLE_ICON_COLORS: Record<string, string> = {
  manager: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "front-desk": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  housekeeping: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  maintenance: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  security: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { role, setRoleId, can } = useRole();

  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => can(item.href));
  const mainNav = visibleNavItems.filter((i) => i.section === "main");
  const opsNav = visibleNavItems.filter((i) => i.section === "operations");
  const showOpsSection = opsNav.length > 0;

  const renderNavItem = (item: (typeof ALL_NAV_ITEMS)[0]) => {
    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3 rounded-md px-3 py-2.5 transition-all text-sm font-medium ${
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        }`}
        data-testid={`nav-${item.label.toLowerCase()}`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/30 lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex fixed inset-y-0 left-0 z-10">
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight text-sidebar-primary">
            <span className="text-xl">Grand</span>
            <span className="text-sidebar-foreground font-sans font-medium text-lg">PMS</span>
          </Link>
        </div>

        <div className="flex-1 overflow-auto py-4">
          <nav className="grid items-start px-4 gap-1">
            {mainNav.map(renderNavItem)}

            {showOpsSection && (
              <>
                <div className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-3 py-2 mt-4">
                  Operations
                </div>
                {opsNav.map(renderNavItem)}
              </>
            )}
          </nav>
        </div>

        {/* Role Switcher + User */}
        <div className="border-t border-sidebar-border">
          {/* Role Switcher */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 mb-1.5 px-1">
              Viewing as
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 bg-sidebar-accent/40 hover:bg-sidebar-accent/70 transition-colors text-sm font-medium">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${ROLE_ICON_COLORS[role.id]}`}>
                    <Shield className="h-3 w-3" />
                  </span>
                  <span className="flex-1 text-left text-sidebar-foreground">{role.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/50 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Switch Role</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ROLES.map((r) => (
                  <DropdownMenuItem
                    key={r.id}
                    onClick={() => setRoleId(r.id as AppRole)}
                    className={`flex flex-col items-start gap-0.5 ${role.id === r.id ? "bg-accent" : ""}`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${ROLE_ICON_COLORS[r.id]}`}>
                        <Shield className="h-3 w-3" />
                      </span>
                      <span className="font-medium">{r.label}</span>
                      {role.id === r.id && <span className="ml-auto text-[10px] text-muted-foreground">active</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground pl-7">{r.description}</p>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User info */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-3 px-3 py-2 rounded-md">
              <Avatar className="h-9 w-9 border border-sidebar-border">
                <AvatarImage src="" alt="Manager" />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-semibold">AM</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">Alex Morgan</span>
                <span className="text-xs text-sidebar-foreground/60 truncate">{role.label}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4 lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
            <Link href="/" className="font-serif text-lg font-bold">Grand PMS</Link>
          </div>

          {/* Current role pill (topbar, mobile/desktop) */}
          <div className="hidden lg:flex items-center">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_ICON_COLORS[role.id]}`}>
              <Shield className="h-3 w-3" />
              {role.label}
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full lg:hidden">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">AM</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
