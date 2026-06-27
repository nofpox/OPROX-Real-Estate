import i18n from "@/i18n";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { useTheme } from "@/hooks/use-theme";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { RoleProvider } from "@/contexts/role-context";
import { LanguageProvider } from "@/contexts/language-context";
import { TourProvider } from "@/components/tour/tour-context";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import Properties from "@/pages/properties";
import PropertyDetail from "@/pages/property-detail";
import Rooms from "@/pages/rooms";
import Maintenance from "@/pages/maintenance";
import Facilities from "@/pages/facilities";
import Staff from "@/pages/staff";
import Tasks from "@/pages/tasks";
import GuestRequests from "@/pages/guest-requests";
import UserManagement from "@/pages/user-management";
import AuditLog from "@/pages/audit-log";
import AdminSettings from "@/pages/admin-settings";
import Login from "@/pages/login";
import { ConsentScreen, isEulaAccepted } from "@/components/ConsentScreen";
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
import Contracts from "@/pages/contracts";
import Invoices from "@/pages/invoices";
import InventoryPage from "@/pages/inventory";
import PreviewLinksPage from "@/pages/preview-links";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

function normTier(role: string): "admin" | "supervisor" | "worker" {
  if (["owner", "admin", "super_admin", "manager", "admin_manager"].includes(role)) return "admin";
  if (["supervisor", "administrator", "partner", "investor", "front-desk", "property-manager", "site-supervisor", "preview_guest"].includes(role)) return "supervisor";
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
      <Route path="/properties" component={Properties} />
      <Route path="/properties/:id" component={PropertyDetail} />
      <Route path="/rooms" component={Rooms} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/facilities" component={Facilities} />
      <Route path="/staff" component={Staff} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/guest-requests" component={GuestRequests} />
      <Route path="/user-management" component={UserManagement} />
      <Route path="/activity-log" component={AuditLog} />
      <Route path="/admin-settings" component={AdminSettings} />
      <Route path="/security-dashboard" component={SecurityDashboard} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/support-tickets" component={SupportTickets} />
      <Route path="/service-config" component={ServiceConfig} />
      <Route path="/content-manager" component={ContentManager} />
      <Route path="/website-settings" component={WebsiteSettings} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/preview-links" component={PreviewLinksPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ThemeApplier() { useTheme(); return null; }

const PREVIEW_SESSION_KEY = "gms_preview_guest";

function App() {
  // Restore a still-valid preview guest session from sessionStorage on page refresh
  const [authUser, setAuthUser] = useState<AuthUser>(() => {
    try {
      const stored = sessionStorage.getItem(PREVIEW_SESSION_KEY);
      if (stored) {
        const { expiresAt, user } = JSON.parse(stored) as { expiresAt: string; user: AuthUser };
        if (user && new Date(expiresAt) > new Date()) return user;
        sessionStorage.removeItem(PREVIEW_SESSION_KEY);
      }
    } catch {}
    return null;
  });

  // Show a loading screen while exchanging the preview_token from the URL
  const [previewExchanging, setPreviewExchanging] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("preview_token")) return false;
    // If we already restored a valid session from sessionStorage, no exchange needed
    try {
      const stored = sessionStorage.getItem(PREVIEW_SESSION_KEY);
      if (stored) {
        const { expiresAt } = JSON.parse(stored) as { expiresAt: string };
        if (new Date(expiresAt) > new Date()) return false;
      }
    } catch {}
    return true;
  });

  const [showWelcome, setShowWelcome] = useState(false);
  const [eulaAccepted, setEulaAccepted] = useState(() => isEulaAccepted());

  // Exchange a one-time preview_token from the URL for a real guest session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("preview_token");
    if (!token) return;
    if (authUser) {
      // Already authenticated (e.g. from sessionStorage) — just clean URL
      window.history.replaceState({}, "", window.location.pathname);
      setPreviewExchanging(false);
      return;
    }
    fetch("/api/preview/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        if (!r.ok) { setPreviewExchanging(false); return; }
        const data = await r.json() as { user: AuthUser; expiresAt: string };
        sessionStorage.setItem(PREVIEW_SESSION_KEY, JSON.stringify({
          expiresAt: data.expiresAt,
          user: data.user,
        }));
        window.history.replaceState({}, "", window.location.pathname);
        setAuthUser(data.user);
        setPreviewExchanging(false);
      })
      .catch(() => setPreviewExchanging(false));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  function handleLogin(user: any) {
    setAuthUser(user as AuthUser);
    setShowWelcome(true);
  }

  function handleLogout() {
    sessionStorage.removeItem(PREVIEW_SESSION_KEY);
    setAuthUser(null);
    setShowWelcome(false);
  }

  // Show spinner while exchanging preview token to avoid Login flash
  if (previewExchanging) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <QueryClientProvider client={queryClient}>
            <Toaster />
            <Login onLogin={handleLogin} />
          </QueryClientProvider>
        </LanguageProvider>
      </I18nextProvider>
    );
  }

  // Consent gate — show once after login, before welcome/dashboard.
  if (authUser && !eulaAccepted && authUser.role !== "preview_guest") {
    return (
      <ConsentScreen
        userId={authUser.id}
        onAccept={() => setEulaAccepted(true)}
      />
    );
  }

  if (showWelcome && authUser?.role !== "preview_guest") {
    return <WelcomeScreen onComplete={() => setShowWelcome(false)} />;
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
                <ThemeApplier />
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Switch>
                    <Route path="/super-admin" component={SuperAdmin} />
                    <Route>
                      <Layout authUser={authUser} onLogout={handleLogout}>
                        <Router />
                      </Layout>
                      <Toaster />
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
