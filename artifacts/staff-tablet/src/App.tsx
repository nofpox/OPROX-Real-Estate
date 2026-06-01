import "@/i18n";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { getQueue, dequeue } from "@/lib/offline-queue";
import { OfflineBanner } from "@/components/OfflineBanner";
import { RTL_LANGS } from "@/i18n/languages";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import UnitDetail from "@/pages/UnitDetail";
import MyTasks from "@/pages/MyTasks";
import WorkOrders from "@/pages/WorkOrders";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function I18nApplier() {
  const { i18n } = useTranslation();
  useEffect(() => {
    const lang = i18n.language;
    document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [i18n.language]);
  return null;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ok">("loading");

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((user) => {
        if (!user) {
          window.location.replace("/login");
        } else {
          setStatus("ok");
        }
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }
  return <>{children}</>;
}

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
      <Route path="/work-orders">
        <AuthGuard><WorkOrders /></AuthGuard>
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
        <I18nApplier />
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
