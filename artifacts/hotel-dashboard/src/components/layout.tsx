import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, DoorOpen, Menu, Building2,
  Wrench, UserCog, ClipboardList, ChevronDown, Shield,
  MapPin, InboxIcon, History, Settings, Dumbbell, SlidersHorizontal, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification-bell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useRole, ROLES, type AppRole } from "@/contexts/role-context";
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "react-i18next";
import type { AuthUser } from "@/App";
import { useSettings } from "@/hooks/use-settings";
import { getEnabledNavKeys } from "@/config/modules";

const NAV_ITEMS = [
  { href: "/",               labelKey: "nav.dashboard",      icon: LayoutDashboard, section: "main",       featureKey: null },
  { href: "/properties",     labelKey: "nav.properties",     icon: Building2,       section: "main",       featureKey: "properties" },
  { href: "/rooms",          labelKey: "nav.rooms",          icon: DoorOpen,        section: "main",       featureKey: "rooms" },
  { href: "/unit-map",       labelKey: "nav.unitMap",        icon: MapPin,          section: "main",       featureKey: "unitMap" },
  { href: "/maintenance",    labelKey: "nav.maintenance",    icon: Wrench,          section: "operations", featureKey: "maintenance" },
  { href: "/facilities",     labelKey: "nav.facilities",     icon: Dumbbell,        section: "operations", featureKey: "facilities" },
  { href: "/staff",          labelKey: "nav.staff",          icon: UserCog,         section: "operations", featureKey: "staff" },
  { href: "/tasks",          labelKey: "nav.tasks",          icon: ClipboardList,   section: "operations", featureKey: "tasks" },
  { href: "/guest-requests", labelKey: "nav.guestRequests",  icon: InboxIcon,       section: "operations", featureKey: "guestRequests" },
  { href: "/activity-log",   labelKey: "nav.activityLog",    icon: History,         section: "operations", featureKey: "activityLog" },
  { href: "/user-management",     labelKey: "nav.userManagement",    icon: Settings,          section: "operations", featureKey: "userManagement" },
  { href: "/admin-settings",      labelKey: "nav.adminSettings",     icon: SlidersHorizontal, section: "operations", featureKey: null },
  { href: "/security-dashboard",  labelKey: "nav.securityDashboard", icon: ShieldAlert,       section: "operations", featureKey: null },
];

/* Role pill colours — solid only, no opacity modifiers */
const ROLE_ICON_COLORS: Record<string, string> = {
  manager:      "bg-purple-100 text-purple-700",
  "front-desk": "bg-amber-100 text-amber-700",
  housekeeping: "bg-green-100 text-green-700",
  maintenance:  "bg-orange-100 text-orange-700",
  security:     "bg-blue-100 text-blue-700",
};

interface LayoutProps {
  children: React.ReactNode;
  authUser: AuthUser;
  onLogout: () => void;
}

export function Layout({ children, authUser, onLogout }: LayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Close the drawer on every route change */
  React.useEffect(() => { setMobileOpen(false); }, [location]);

  const { role, setRoleId, can } = useRole();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const settings = useSettings();

  const enabledNavKeys = getEnabledNavKeys(settings.enabledModules);
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!can(item.href)) return false;
    if (item.featureKey === null) return true;
    return enabledNavKeys.has(item.featureKey);
  });
  const mainNav = visibleNavItems.filter((i) => i.section === "main");
  const opsNav  = visibleNavItems.filter((i) => i.section === "operations");
  const showOpsSection = opsNav.length > 0;

  const displayName = authUser?.displayName ?? "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();

  /* ── Nav item renderer ──────────────────────────────────────────────────
   * NO transition-* classes anywhere.
   * Active state: solid bg-sidebar-accent, full opacity text.
   * Inactive state: text-sidebar-foreground, no hover animation.
   * ----------------------------------------------------------------------- */
  const renderNavItem = (item: (typeof NAV_ITEMS)[0]) => {
    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent"
        }`}
        data-testid={`nav-${item.href.replace("/", "") || "dashboard"}`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {t(item.labelKey)}
      </Link>
    );
  };

  const sidebarSide   = isRTL ? "right-0" : "left-0";
  const sidebarBorder = isRTL ? "border-l" : "border-r";
  const mainPadding   = isRTL ? "lg:pr-64" : "lg:pl-64";

  /* Shared sidebar interior — same markup for both mobile and desktop */
  const SidebarContent = () => (
    <>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-4 gap-1" onClick={() => setMobileOpen(false)}>
          {mainNav.map(renderNavItem)}
          {showOpsSection && (
            <>
              <div className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground px-3 py-2 mt-4" style={{ opacity: 0.4 }}>
                {t("nav.operations")}
              </div>
              {opsNav.map(renderNavItem)}
            </>
          )}
        </nav>
      </div>

      <div className="border-t border-sidebar-border">
        {/* Role switcher */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground px-1 mb-1.5" style={{ opacity: 0.4 }}>
            {t("roles.viewingAs")}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 bg-sidebar-accent text-sm font-medium">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${ROLE_ICON_COLORS[role.id]}`}>
                  <Shield className="h-3 w-3" />
                </span>
                <span className="flex-1 text-start text-sidebar-foreground">{t(`roles.${role.id}`)}</span>
                <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground shrink-0" style={{ opacity: 0.5 }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">{t("roles.switchRole")}</DropdownMenuLabel>
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
                    <span className="font-medium">{t(`roles.${r.id}`)}</span>
                    {role.id === r.id && <span className="ml-auto text-[10px] text-muted-foreground">{t("roles.active")}</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground ps-7">{t(`roles.desc.${r.id}`)}</p>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* User menu */}
        <div className="px-4 pb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer">
                <Avatar className="h-9 w-9 border border-sidebar-border">
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">{displayName}</span>
                  <span className="text-xs text-sidebar-foreground truncate capitalize" style={{ opacity: 0.6 }}>{authUser?.role ?? "staff"}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground shrink-0" style={{ opacity: 0.5 }} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52 mb-1">
              <DropdownMenuLabel className="text-sm">{displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                {t("header.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );

  return (
    /*
     * Outer wrapper: solid bg-muted — NO /30 opacity modifier.
     * Opacity-suffixed background classes force the browser to create a new
     * stacking context + compositor layer on the root element, which is the
     * trigger for the horizontal-stripe GPU corruption on Android Chrome.
     */
    <div className="flex min-h-screen w-full flex-col bg-muted lg:flex-row">

      {/*
       * Mobile sidebar — conditionally rendered, ZERO CSS animation, ZERO transition.
       * NO backdrop overlay div — it was the rgba(0,0,0,0.6) compositor layer
       * that caused the GPU glitch. The sidebar has a ✕ close button and every
       * nav item click also closes it.
       */}
      {mobileOpen && (
        <aside
          className={`fixed inset-y-0 z-50 w-72 flex flex-col bg-sidebar text-sidebar-foreground ${sidebarSide} ${sidebarBorder}`}
          style={{ boxShadow: isRTL ? "-4px 0 24px rgba(0,0,0,0.35)" : "4px 0 24px rgba(0,0,0,0.35)" }}
        >
          <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-sidebar-border">
            <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight text-sidebar-primary">
              <span className="text-xl">{settings.logoText}</span>
              <span className="text-sidebar-foreground font-sans font-medium text-lg">{settings.logoSub}</span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded p-1 text-sidebar-foreground"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
          <SidebarContent />
        </aside>
      )}

      {/* Desktop sidebar — always in DOM on lg+, hidden on mobile via lg:flex */}
      <aside className={`hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex fixed inset-y-0 z-10 ${sidebarSide} ${sidebarBorder}`}>
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight text-sidebar-primary">
            <span className="text-xl">{settings.logoText}</span>
            <span className="text-sidebar-foreground font-sans font-medium text-lg">{settings.logoSub}</span>
          </Link>
        </div>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className={`flex flex-1 flex-col ${mainPadding}`}>
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4 lg:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Link href="/" className="font-serif text-lg font-bold">{settings.logoText} {settings.logoSub}</Link>
          </div>
          <div className="hidden lg:flex items-center">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_ICON_COLORS[role.id]}`}>
              <Shield className="h-3 w-3" />
              {t(`roles.${role.id}`)}
            </span>
          </div>
          <div className="flex items-center gap-2 ms-auto">
            <LanguageSwitcher />
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
