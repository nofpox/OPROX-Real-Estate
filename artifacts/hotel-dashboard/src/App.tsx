import "@/i18n";
import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

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
      <Route component={NotFound} />
    </Switch>
  );
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
  const [authUser, setAuthUser] = useState<AuthUser>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((user) => { setAuthUser(user); setAuthChecked(true); });
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
    });
  }

  if (!authUser) {
    return (
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <Toaster />
          <Login onLogin={(user) => setAuthUser(user as AuthUser)} />
        </QueryClientProvider>
      </LanguageProvider>
    );
  }

  if (authUser.mustChangePassword) {
    return (
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <Toaster />
          <ForcePasswordChange
            username={authUser.displayName}
            onSuccess={() => setAuthUser({ ...authUser, mustChangePassword: false })}
          />
        </QueryClientProvider>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RoleProvider>
            <ActorHeaderSync displayName={authUser.displayName} />
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
  );
}

export default App;
