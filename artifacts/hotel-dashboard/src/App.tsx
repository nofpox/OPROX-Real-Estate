import "@/i18n";
  import { useState, useEffect } from "react";
  import { Switch, Route, Router as WouterRouter } from "wouter";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { Toaster } from "@/components/ui/toaster";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { Layout } from "@/components/layout";
  import { RoleProvider } from "@/contexts/role-context";
  import { LanguageProvider } from "@/contexts/language-context";
  import Dashboard from "@/pages/dashboard";
  import Bookings from "@/pages/bookings";
  import NewBooking from "@/pages/booking-new";
  import BookingDetail from "@/pages/booking-detail";
  import Rooms from "@/pages/rooms";
  import Income from "@/pages/income";
  import Guests from "@/pages/guests";
  import GuestProfile from "@/pages/guest-profile";
  import NotFound from "@/pages/not-found";
  import Properties from "@/pages/properties";
  import PropertyDetail from "@/pages/property-detail";
  import Finance from "@/pages/finance";
  import Maintenance from "@/pages/maintenance";
  import Staff from "@/pages/staff";
  import Tasks from "@/pages/tasks";
  import GuestRequests from "@/pages/guest-requests";
  import UserManagement from "@/pages/user-management";
  import ActivityLog from "@/pages/activity-log";
  import UnitMap from "@/pages/unit-map";
  import Login from "@/pages/login";

  const queryClient = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
  });

  export type AuthUser = {
    id: number; username: string; displayName: string; role: string; permissions: string[];
  } | null;

  function Router() {
    return (
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/bookings" component={Bookings} />
        <Route path="/bookings/new" component={NewBooking} />
        <Route path="/bookings/:id" component={BookingDetail} />
        <Route path="/rooms" component={Rooms} />
        <Route path="/income" component={Income} />
        <Route path="/guests" component={Guests} />
        <Route path="/guests/:email" component={GuestProfile} />
        <Route path="/properties" component={Properties} />
        <Route path="/properties/:id" component={PropertyDetail} />
        <Route path="/finance" component={Finance} />
        <Route path="/maintenance" component={Maintenance} />
        <Route path="/staff" component={Staff} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/guest-requests" component={GuestRequests} />
        <Route path="/user-management" component={UserManagement} />
        <Route path="/activity-log" component={ActivityLog} />
        <Route path="/unit-map" component={UnitMap} />
        <Route component={NotFound} />
      </Switch>
    );
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

    if (!authUser) {
      return (
        <LanguageProvider>
          <Toaster />
          <Login onLogin={(user) => setAuthUser(user as AuthUser)} />
        </LanguageProvider>
      );
    }

    function handleLogout() {
      fetch("/api/auth/logout", { method: "POST", credentials: "include" }).finally(() => {
        setAuthUser(null);
      });
    }

    return (
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <RoleProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Layout authUser={authUser} onLogout={handleLogout}>
                  <Router />
                </Layout>
              </WouterRouter>
            </RoleProvider>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    );
  }

  export default App;
  