import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
  import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
  import { Toaster } from "@/components/ui/toaster";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { useEffect } from "react";
  import { useOnlineStatus } from "@/hooks/use-online-status";
  import { getQueue, dequeue } from "@/lib/offline-queue";
  import { OfflineBanner } from "@/components/OfflineBanner";
  import Login from "@/pages/Login";
  import Dashboard from "@/pages/Dashboard";
  import UnitDetail from "@/pages/UnitDetail";
  import MyTasks from "@/pages/MyTasks";
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

  /**
   * Replays the offline queue on every reconnection.
   * Mounted at root so it fires regardless of which page the worker is viewing.
   */
  function GlobalOfflineSync() {
    const { isOnline } = useOnlineStatus();
    const qc = useQueryClient();

    useEffect(() => {
      if (!isOnline) return;
      const queue = getQueue();
      if (!queue.length) return;

      (async () => {
        for (const { id: entryId, action } of queue) {
          try {
            let url = "";
            let body: string | undefined;
            let method = "PATCH";

            if (action.type === "updateStatus") {
              url  = `/api/rooms/${action.roomId}`;
              body = JSON.stringify({ status: action.status });
            } else if (action.type === "resolveRequest") {
              url  = `/api/guest/requests/${action.requestId}`;
              body = JSON.stringify({ status: "resolved" });
            } else {
              dequeue(entryId);
              continue;
            }

            const res = await fetch(url, {
              method,
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body,
            });
            if (res.status < 500) {
              dequeue(entryId);
            }
          } catch {
            break;
          }
        }
        qc.invalidateQueries({ queryKey: ["rooms"] });
        qc.invalidateQueries({ queryKey: ["guest-requests"] });
      })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline]);

    return null;
  }

  function Router() {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/tasks">
          <AuthGuard><MyTasks /></AuthGuard>
        </Route>
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
            <GlobalOfflineSync />
            <Router />
          </WouterRouter>
          <Toaster />
          <OfflineBanner />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
