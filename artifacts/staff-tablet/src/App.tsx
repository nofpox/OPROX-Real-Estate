import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { Toaster } from "@/components/ui/toaster";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { useEffect } from "react";
  import Login from "@/pages/Login";
  import Dashboard from "@/pages/Dashboard";
  import UnitDetail from "@/pages/UnitDetail";
  import NotFound from "@/pages/not-found";

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  });

  function AuthGuard({ children }: { children: React.ReactNode }) {
    const [, navigate] = useLocation();
    useEffect(() => {
      if (!localStorage.getItem("grand_pms_session")) {
        navigate("/login");
      }
    }, []);
    return <>{children}</>;
  }

  function Router() {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/">
          <AuthGuard><Dashboard /></AuthGuard>
        </Route>
        <Route path="/unit/:id">
          {(params) => <AuthGuard><UnitDetail id={Number(params.id)} /></AuthGuard>}
        </Route>
        <Route component={NotFound} />
      </Switch>
    );
  }

  export default function App() {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  