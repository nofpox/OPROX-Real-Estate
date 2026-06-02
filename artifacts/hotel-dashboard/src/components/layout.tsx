import React, { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, DoorOpen, Menu, Building2,
  Wrench, UserCog, ClipboardList, ChevronDown, Shield,
  MapPin, InboxIcon, History, Settings, Dumbbell, SlidersHorizontal, ShieldAlert, BarChart2,
  Ticket, MessageCircleQuestion, Settings2, HelpCircle,
  Calendar, Users, DollarSign, Archive, LayoutTemplate, TrendingUp, Monitor,
} from "lucide-react";
import { SupportDialog } from "@/components/support-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification-bell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useRole, ROLES, type AppRole, isOwnerTier } from "@/contexts/role-context";
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "react-i18next";
import type { AuthUser } from "@/App";
import { useSettings } from "@/hooks/use-settings";
import { getEnabledNavKeys } from "@/config/modules";
import { useToast } from "@/hooks/use-toast";
import { TourOverlay } from "@/components/tour/tour-overlay";
import { SmartHintBar } from "@/components/tour/smart-hint-bar";
import { useTour } from "@/components/tour/tour-context";
import { AppAIAgent } from "@/components/AppAIAgent";

const NAV_ITEMS = [
  { href: "/",               labelKey: "nav.dashboard",      icon: LayoutDashboard, section: "main",       featureKey: null       },
  { href: "/bookings",       labelKey: "nav.bookings",       icon: Calendar,        section: "main",       featureKey: "bookings" },
  { href: "/properties",     labelKey: "nav.properties",     icon: Building2,       section: "main",       featureKey: "properties" },
  { href: "/rooms",          labelKey: "nav.rooms",          icon: DoorOpen,        section: "main",       featureKey: "rooms"    },
  { href: "/guests",         labelKey: "nav.guests",         icon: Users,           section: "main",       featureKey: "guests"   },
  { href: "/unit-map",       labelKey: "nav.unitMap",        icon: MapPin,          section: "main",       featureKey: "unitMap"  },
  { href: "/finance",        labelKey: "nav.finance",        icon: DollarSign,      section: "operations", featureKey: null       },
  { href: "/maintenance",    labelKey: "nav.maintenance",    icon: Wrench,          section: "operations", featureKey: "maintenance" },
  { href: "/facilities",     labelKey: "nav.facilities",     icon: Dumbbell,        section: "operations", featureKey: "facilities" },
  { href: "/staff",          labelKey: "nav.staff",          icon: UserCog,         section: "operations", featureKey: "staff" },
  { href: "/tasks",          labelKey: "nav.tasks",          icon: ClipboardList,   section: "operations", featureKey: "tasks" },
  { href: "/guest-requests", labelKey: "nav.guestRequests",  icon: InboxIcon,       section: "operations", featureKey: "guestRequests" },
  { href: "/activity-log",   labelKey: "nav.activityLog",    icon: History,         section: "operations", featureKey: "activityLog" },
  { href: "/user-management",     labelKey: "nav.userManagement",    icon: Settings,          section: "operations", featureKey: "userManagement" },
  { href: "/admin-settings",      labelKey: "nav.adminSettings",     icon: SlidersHorizontal, section: "operations", featureKey: null },
  { href: "/security-dashboard",  labelKey: "nav.securityDashboard", icon: ShieldAlert,       section: "operations", featureKey: null },
  { href: "/analytics",           labelKey: "nav.analytics",         icon: BarChart2,          section: "operations", featureKey: null },
  { href: "/support-tickets",    labelKey: "nav.supportTickets",    icon: Ticket,             section: "operations", featureKey: null },
  { href: "/data-archiving",     labelKey: "nav.dataArchiving",     icon: Archive,             section: "operations", featureKey: null },
  { href: "/partner",           labelKey: "nav.partnerPortal",    icon: TrendingUp,           section: "main",       featureKey: null },
];

/* Role pill colours — solid only, no opacity modifiers */
const ROLE_ICON_COLORS: Record<string, string> = {
  super_admin:   "bg-red-100 text-red-700",
  owner:         "bg-yellow-100 text-yellow-700",
  admin_manager: "bg-indigo-100 text-indigo-700",
  manager:       "bg-purple-100 text-purple-700",
  administrator: "bg-teal-100 text-teal-700",
  supervisor:    "bg-amber-100 text-amber-700",
  maintenance:   "bg-orange-100 text-orange-700",
  cleaning:      "bg-green-100 text-green-700",
  security:      "bg-blue-100 text-blue-700",
  partner:       "bg-emerald-100 text-emerald-700",
};

interface LayoutProps {
  children: React.ReactNode;
  authUser: AuthUser;
  onLogout: () => void;
}

/* ── SidebarContent props ────────────────────────────────────────────────────
 * Defined OUTSIDE Layout so the component identity is stable across renders.
 * Defining it inside Layout creates a new function type on every render,
 * causing React to unmount/remount the entire sidebar subtree each time.
 * ─────────────────────────────────────────────────────────────────────────── */
interface SidebarContentProps {
  authUser: AuthUser;
  onLogout: () => void;
  onClose: () => void;
}

function hrefToNavId(href: string): string {
  return href === "/" ? "dashboard" : href.replace(/^\//, "");
}

function SidebarContent({ authUser, onLogout, onClose }: SidebarContentProps) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { role, setRoleId, can } = useRole();
  const [supportOpen, setSupportOpen] = useState(false);
  const settings = useSettings();

  const enabledNavKeys = getEnabledNavKeys(settings.enabledModules);
  const isOwnerTierRole = role.allowedNav.includes("*");

  // Build navConfig lookup
  const navCfgById = Object.fromEntries(
    (settings.navConfig ?? []).map((c) => [c.id, c])
  );

  // Sort NAV_ITEMS by configured order
  const sortedNavItems = [...NAV_ITEMS].sort((a, b) => {
    const aOrd = navCfgById[hrefToNavId(a.href)]?.order ?? 999;
    const bOrd = navCfgById[hrefToNavId(b.href)]?.order ?? 999;
    return aOrd - bOrd;
  });

  // Permission matrix for current role (only for non-owner tiers)
  const permMatrix = settings.permissionMatrix ?? {};
  const roleMatrix: string[] | null = !isOwnerTierRole ? (permMatrix[role.id] ?? null) : null;

  const visibleNavItems = sortedNavItems.filter((item) => {
    // NavConfig visibility gate (owners bypass)
    if (!isOwnerTierRole) {
      const cfg = navCfgById[hrefToNavId(item.href)];
      if (cfg && !cfg.visible) return false;
    }
    // Permission matrix overrides static RBAC for configurable roles
    if (roleMatrix !== null) {
      if (!roleMatrix.includes(item.href)) return false;
      // Still check module enablement
      if (item.featureKey !== null && !enabledNavKeys.has(item.featureKey)) return false;
      return true;
    }
    // Standard RBAC + module check
    if (!can(item.href)) return false;
    if (item.featureKey === null) return true;
    return enabledNavKeys.has(item.featureKey);
  });

  const mainNav = visibleNavItems.filter((i) => i.section === "main");
  const opsNav  = visibleNavItems.filter((i) => i.section === "operations");
  const showOpsSection = opsNav.length > 0;

  const displayName = authUser?.displayName ?? "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();

  const renderNavItem = (item: (typeof NAV_ITEMS)[0]) => {
    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
    const Icon = item.icon;
    const navId = hrefToNavId(item.href);
    const customLabel = navCfgById[navId]?.label;
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
        data-tour={`nav-${item.href === "/" ? "dashboard" : item.href.slice(1)}`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {customLabel ?? t(item.labelKey)}
      </Link>
    );
  };

  return (
    <>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-4 gap-1" onClick={onClose}>
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

      {/* Support button — visible to all users */}
      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} authUser={authUser} />
      <div className="px-4 py-2">
        <button
          onClick={() => setSupportOpen(true)}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <MessageCircleQuestion className="h-5 w-5 shrink-0" />
          {t("support.buttonLabel")}
        </button>
      </div>

      <div className="border-t border-sidebar-border">
        {/* Role display — switcher for owners, static badge for everyone else */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground px-1 mb-1.5" style={{ opacity: 0.4 }}>
            {t("roles.viewingAs")}
          </p>
          {isOwnerTier(authUser?.role ?? "") ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-tour="tour-role-switcher" className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 bg-sidebar-accent text-sm font-medium">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${ROLE_ICON_COLORS[role.id] ?? ""}`}>
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
                      <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${ROLE_ICON_COLORS[r.id] ?? ""}`}>
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
          ) : (
            <div className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 bg-sidebar-accent text-sm font-medium">
              <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${ROLE_ICON_COLORS[role.id] ?? ""}`}>
                <Shield className="h-3 w-3" />
              </span>
              <span className="flex-1 text-start text-sidebar-foreground">{t(`roles.${role.id}`)}</span>
            </div>
          )}
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
}

export function Layout({ children, authUser, onLogout }: LayoutProps) {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { toast } = useToast();
  const { startTour } = useTour();

  // ── Swipe-to-close gesture ─────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // Ignore mostly-vertical swipes (scrolling)
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    const THRESHOLD = 60;
    // LTR: sidebar on left  → swipe left  (negative deltaX) to close
    // RTL: sidebar on right → swipe right (positive deltaX) to close
    if (!isRTL && deltaX < -THRESHOLD) setMobileOpen(false);
    if (isRTL  && deltaX >  THRESHOLD) setMobileOpen(false);
  }

  /* Close the drawer on every route change */
  React.useEffect(() => { setMobileOpen(false); }, [location]);

  /* Route guard — redirect to first allowed page if current path is inaccessible */
  const { can, role } = useRole();
  React.useEffect(() => {
    if (!can(location)) {
      const firstAllowed = role.allowedNav.find((p) => p !== "*") ?? "/tasks";
      navigate(firstAllowed);
      toast({
        title: "Page not available",
        description: `This page isn't accessible in the current role view. Redirecting you to a permitted page.`,
        duration: 4000,
      });
    }
  }, [location, role.id]);

  const { isRTL, lang } = useLanguage();
  const { t } = useTranslation();
  const settings = useSettings();

  const sidebarSide   = isRTL ? "right-0" : "left-0";
  const sidebarBorder = isRTL ? "border-l" : "border-r";
  const mainPadding   = isRTL ? "lg:pr-64" : "lg:pl-64";

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
       * Backdrop is fully transparent (no fill color) so it adds zero GPU compositor
       * overhead — the rgba(0,0,0,0.6) fill was the original cause of Android Chrome
       * horizontal-stripe glitches. Click-outside and swipe-to-close are handled via
       * the backdrop div and touch events on the <aside> respectively.
       */}
      {mobileOpen && (
        <>
          {/* Click-outside backdrop — transparent so no GPU compositor layer */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          <aside
            className={`fixed inset-y-0 z-50 w-72 flex flex-col bg-sidebar text-sidebar-foreground ${sidebarSide} ${sidebarBorder}`}
            style={{ boxShadow: isRTL ? "-4px 0 24px rgba(0,0,0,0.35)" : "4px 0 24px rgba(0,0,0,0.35)" }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-sidebar-border">
              <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight text-sidebar-primary">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt={settings.logoText} className="h-8 w-auto object-contain max-w-28" />
                ) : (
                  <>
                    <span className="text-xl">{settings.logoText}</span>
                    <span className="text-sidebar-foreground font-sans font-medium text-lg">{settings.logoSub}</span>
                  </>
                )}
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded p-1 text-sidebar-foreground"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <SidebarContent authUser={authUser} onLogout={onLogout} onClose={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      {/* Desktop sidebar — always in DOM on lg+, hidden on mobile via lg:flex */}
      <aside className={`hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex fixed inset-y-0 z-10 ${sidebarSide} ${sidebarBorder}`}>
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight text-sidebar-primary">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.logoText} className="h-8 w-auto object-contain max-w-28" />
            ) : (
              <>
                <span className="text-xl">{settings.logoText}</span>
                <span className="text-sidebar-foreground font-sans font-medium text-lg">{settings.logoSub}</span>
              </>
            )}
          </Link>
        </div>
        <SidebarContent authUser={authUser} onLogout={onLogout} onClose={() => {}} />
      </aside>

      {/* Main content */}
      <div className={`flex flex-1 flex-col ${mainPadding}`}>
        <header
          className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-20"
        >
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
            {/* Help / tour launcher */}
            <button
              onClick={startTour}
              title="Start guided tour"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Start guided tour"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <LanguageSwitcher />
            <NotificationBell />
          </div>
        </header>

        <main key={lang} className="flex-1 p-4 md:p-6 lg:p-8" style={{ isolation: "isolate" }}>
          <SmartHintBar />
          {children}
        </main>
      </div>

      {/* Onboarding tour overlay — rendered via portal at document.body */}
      <TourOverlay />

      {/* Proactive AI Agent — floating assistant for all users */}
      <AppAIAgent authUser={authUser} />
    </div>
  );
}
