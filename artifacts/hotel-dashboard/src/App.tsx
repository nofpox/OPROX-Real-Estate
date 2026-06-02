import i18n from "@/i18n";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { OfflineBanner } from "@/components/offline-banner";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { RoleProvider, useRole } from "@/contexts/role-context";
import { LanguageProvider } from "@/contexts/language-context";
import { setDefaultHeaders } from "@workspace/api-client-react";
import { TourProvider } from "@/components/tour/tour-context";
import Dashboard from "@/pages/dashboard";
// Rooms (حالة الوحدات) hidden — UI on hold; restore by un-commenting import + Route
// import Rooms from "@/pages/rooms";
import NotFound from "@/pages/not-found";
import Properties from "@/pages/properties";
import PropertyDetail from "@/pages/property-detail";
import Maintenance from "@/pages/maintenance";
import Facilities from "@/pages/facilities";
import Staff from "@/pages/staff";
import Tasks from "@/pages/tasks";
import GuestRequests from "@/pages/guest-requests";
import UserManagement from "@/pages/user-management";
import AuditLog from "@/pages/audit-log";
import AdminSettings from "@/pages/admin-settings";
// UnitMap hidden — UI on hold; backend/DB intact
// import UnitMap from "@/pages/unit-map";
import Login from "@/pages/login";
import ForcePasswordChange from "@/pages/force-password-change";
import SuperAdmin from "@/pages/super-admin";
import SecurityDashboard from "@/pages/security-dashboard";
import Analytics from "@/pages/analytics";
import SupportTickets from "@/pages/support-tickets";
import SuspendedPage from "@/pages/suspended";
import ServiceConfig from "@/pages/service-config";
import WorkerDashboard from "@/pages/worker-dashboard";
import WorkerTasks from "@/pages/worker-tasks";
import WorkerWorkOrders from "@/pages/worker-work-orders";
import WorkerUnitDetail from "@/pages/worker-unit-detail";
import ContentManager from "@/pages/content-manager";
import WebsiteSettings from "@/pages/website-settings";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

/** Mirror of the server-side normTier — decides which portal a user belongs to. */
function normTier(role: string): "admin" | "supervisor" | "worker" {
  if (["owner", "admin", "super_admin"].includes(role)) return "admin";
  if (["manager", "property-manager", "site-supervisor", "admin-manager", "front-desk", "supervisor", "partner", "investor"].includes(role)) return "supervisor";
  return "worker";
}

export type AuthUser = {
  id: number; username: string; displayName: string; role: string; permissions: string[];
  mustChangePassword?: boolean;
} | null;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      {/* /rooms hidden — UI on hold; restore by un-commenting import + this Route */}
      <Route path="/properties" component={Properties} />
      <Route path="/properties/:id" component={PropertyDetail} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/facilities" component={Facilities} />
      <Route path="/staff" component={Staff} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/guest-requests" component={GuestRequests} />
      <Route path="/user-management" component={UserManagement} />
      <Route path="/activity-log" component={AuditLog} />
      <Route path="/admin-settings" component={AdminSettings} />
      {/* /unit-map hidden — UI on hold; restore by un-commenting import + this Route */}
      <Route path="/security-dashboard" component={SecurityDashboard} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/support-tickets" component={SupportTickets} />
      <Route path="/service-config" component={ServiceConfig} />
      <Route path="/content-manager" component={ContentManager} />
      <Route path="/website-settings" component={WebsiteSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

/** Mounts the global offline queue replay — works on every page, not just Tasks. */
function GlobalOfflineSync() {
  useOfflineSync();
  return null;
}

/** Reads primaryColor + secondaryColor from settings and injects CSS vars into :root. */
function ThemeApplier() {
  useTheme();
  return null;
}

/** Keeps x-actor-* headers in sync whenever the dashboard role changes. */
function ActorHeaderSync({ displayName }: { displayName: string }) {
  const { role } = useRole();
  useEffect(() => {
    setDefaultHeaders({
      "x-actor-name": displayName,
      "x-actor-role": role.id,
    });
  }, [displayName, role.id]);
  return null;
}

function App() {
  const [authUser,    setAuthUser]    = useState<AuthUser>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  // Refs so the fetch interceptor always reads the latest setters without re-running the effect
  const setSuspendedRef  = useRef(setIsSuspended);
  const setAuthUserRef   = useRef(setAuthUser);
  const setAuthCheckedRef = useRef(setAuthChecked);

  // ── Global fetch interceptor ─────────────────────────────────────────────
  // • 401 on any non-auth route  → session expired; return to login screen
  // • 403 TENANT_SUSPENDED       → show the suspended wall
  useEffect(() => {
    const origFetch = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await origFetch(...args);

      // Resolve the URL string regardless of how fetch was called
      const rawUrl = typeof args[0] === "string"
        ? args[0]
        : args[0] instanceof URL
          ? args[0].href
          : (args[0] as Request).url;
      const isAuthRoute = rawUrl.includes("/api/auth/");

      if (res.status === 401 && !isAuthRoute) {
        // Session is gone — silently return user to the login screen
        setAuthUserRef.current(null);
        setAuthCheckedRef.current(true);
      }

      if (res.status === 403) {
        res.clone().json().then((data: unknown) => {
          if (
            data && typeof data === "object" &&
            (data as Record<string, unknown>).error === "TENANT_SUSPENDED"
          ) {
            setSuspendedRef.current(true);
          }
        }).catch(() => {});
      }

      return res;
    };
    return () => { window.fetch = origFetch; };
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((user) => {
        setAuthUser(user);
        setAuthChecked(true);
      });
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  function handleLogout() {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).finally(() => {
      setAuthUser(null);
      setIsSuspended(false);
    });
  }

  // ── Suspended wall: shown to any logged-in user of a suspended tenant ──────
  if (isSuspended) {
    return (
      <I18nextProvider i18n={i18n}>
        <Toaster />
        <SuspendedPage onSignOut={handleLogout} />
      </I18nextProvider>
    );
  }

  if (!authUser) {
    return (
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <QueryClientProvider client={queryClient}>
            <Toaster />
            <Login onLogin={(user: any) => {
              setAuthUser(user as AuthUser);
            }} />
          </QueryClientProvider>
        </LanguageProvider>
      </I18nextProvider>
    );
  }

  if (authUser.mustChangePassword) {
    return (
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <QueryClientProvider client={queryClient}>
            <Toaster />
            <ForcePasswordChange
              username={authUser.displayName}
              onSuccess={() => setAuthUser({ ...authUser, mustChangePassword: false })}
            />
          </QueryClientProvider>
        </LanguageProvider>
      </I18nextProvider>
    );
  }

  const tier = normTier(authUser.role);
  const isWorker = tier === "worker";

  if (isWorker) {
    return (
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <QueryClientProvider client={queryClient}>
            <Toaster />
            <OfflineBanner />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Switch>
                <Route path="/worker/unit/:id">
                  {(params) => <WorkerUnitDetail id={Number(params.id)} />}
                </Route>
                <Route path="/worker/tasks" component={WorkerTasks} />
                <Route path="/worker/work-orders" component={WorkerWorkOrders} />
                <Route>
                  <WorkerDashboard onLogout={handleLogout} />
                </Route>
              </Switch>
            </WouterRouter>
          </QueryClientProvider>
        </LanguageProvider>
      </I18nextProvider>
    );
  }

  return (
    <TourProvider userId={authUser.id}>
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <RoleProvider initialRole={authUser.role}>
              <ActorHeaderSync displayName={authUser.displayName} />
              <GlobalOfflineSync />
              <ThemeApplier />
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Switch>
                  <Route path="/super-admin" component={SuperAdmin} />
                  <Route>
                    <Layout authUser={authUser} onLogout={handleLogout}>
                      <Router />
                    </Layout>
                    <Toaster />
                    <OfflineBanner />
                  </Route>
                </Switch>
              </WouterRouter>
            </RoleProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </I18nextProvider>
    </TourProvider>
  );
}

export default App;
