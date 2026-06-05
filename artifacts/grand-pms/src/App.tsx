import i18n from "@/i18n";
import { useState } from "react";
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
import Maintenance from "@/pages/maintenance";
import Facilities from "@/pages/facilities";
import Staff from "@/pages/staff";
import Tasks from "@/pages/tasks";
import GuestRequests from "@/pages/guest-requests";
import UserManagement from "@/pages/user-management";
import AuditLog from "@/pages/audit-log";
import AdminSettings from "@/pages/admin-settings";
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
import { AppAIAgent } from "@/components/AppAIAgent";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

function normTier(role: string): "admin" | "supervisor" | "worker" {
  if (["owner", "admin", "super_admin", "manager", "admin_manager"].includes(role)) return "admin";
  if (["supervisor", "administrator", "partner", "investor", "front-desk", "property-manager", "site-supervisor"].includes(role)) return "supervisor";
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
      <Route component={NotFound} />
    </Switch>
  );
}

function ThemeApplier() { useTheme(); return null; }

function App() {
  const [authUser, setAuthUser] = useState<AuthUser>(null);

  function handleLogout() { setAuthUser(null); }

  if (!authUser) {
    return (
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <QueryClientProvider client={queryClient}>
            <Toaster />
            <Login onLogin={(user: any) => setAuthUser(user as AuthUser)} />
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
            <AppAIAgent authUser={authUser} />
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
