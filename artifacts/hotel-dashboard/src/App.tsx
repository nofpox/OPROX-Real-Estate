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
import Dashboard from "@/pages/dashboard";
import Bookings from "@/pages/bookings";
import NewBooking from "@/pages/booking-new";
import BookingDetail from "@/pages/booking-detail";
import Rooms from "@/pages/rooms";
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
import UnitMap from "@/pages/unit-map";
import Login from "@/pages/login";
import ForcePasswordChange from "@/pages/force-password-change";
import SuperAdmin from "@/pages/super-admin";
import SecurityDashboard from "@/pages/security-dashboard";
import Analytics from "@/pages/analytics";
import SupportTickets from "@/pages/support-tickets";
import SuspendedPage from "@/pages/suspended";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

/** Mirror of the server-side normTier — decides which portal a user belongs to. */
function normTier(role: string): "admin" | "supervisor" | "worker" {
  if (["owner", "admin", "super_admin"].includes(role)) return "admin";
  if (["manager", "property-manager", "site-supervisor"].includes(role)) return "supervisor";
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
      <Route path="/bookings" component={Bookings} />
      <Route path="/bookings/new" component={NewBooking} />
      <Route path="/bookings/:id" component={BookingDetail} />
      <Route path="/rooms" component={Rooms} />
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
      <Route path="/unit-map" component={UnitMap} />
      <Route path="/security-dashboard" component={SecurityDashboard} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/support-tickets" component={SupportTickets} />
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
  // Ref so the fetch interceptor always reads the latest setter without re-running the effect
  const setSuspendedRef = useRef(setIsSuspended);

  // ── Global fetch interceptor: catch TENANT_SUSPENDED on any API response ───
  useEffect(() => {
    const origFetch = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await origFetch(...args);
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
        // Workers belong in the Staff portal — redirect silently
        if (user && normTier(user.role) === "worker") {
          window.location.replace("/staff");
          return;
        }
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
              // Smart redirect: workers go to the Staff Tablet portal
              if (normTier(user.role) === "worker") {
                window.location.replace("/staff");
              } else {
                setAuthUser(user as AuthUser);
              }
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

  return (
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
  );
}

export default App;
