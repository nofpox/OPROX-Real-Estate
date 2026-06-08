import { HelmetProvider } from "react-helmet-async";
import { useState } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route, Router as WouterRouter } from "wouter";
import NotFound from "@/pages/not-found";
import { LanguageProvider } from "@/lib/i18n";
import { Layout } from "@/components/layout";
import { Home } from "@/pages/home";
import { ListingsBrowser } from "@/pages/listings";
import { ListingDetail } from "@/pages/listing-detail";
import { Services } from "@/pages/services";
import { Contact } from "@/pages/contact";
import { PortalAuthProvider } from "@/lib/portal-auth";
import { CmsProvider } from "@/lib/cms-context";
import { PortalLogin } from "@/pages/portal-login";
import { PortalDashboard } from "@/pages/portal-dashboard";
import { ServiceDetail } from "@/pages/service-detail";
import { Join } from "@/pages/join";
import { PortalRegister } from "@/pages/portal-register";
import { BuyerDashboard } from "@/pages/buyer-dashboard";
import { PreviewToken } from "@/pages/preview-token";
import { ScreenGuard } from "@/components/ScreenGuard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime:    300_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/listings" component={ListingsBrowser} />
      <Route path="/listings/:id" component={ListingDetail} />
      <Route path="/services" component={Services} />
      <Route path="/services/:slug" component={ServiceDetail} />
      <Route path="/contact" component={Contact} />
      {/* Legacy user-facing routes — redirect to admin gate */}
      <Route path="/join" component={Join} />
      <Route path="/portal/register" component={PortalRegister} />
      <Route path="/portal/buyer" component={BuyerDashboard} />
      {/* Admin Control Room */}
      <Route path="/portal" component={PortalLogin} />
      <Route path="/portal/dashboard" component={PortalDashboard} />
      {/* Secure temporary preview links (public, no auth) */}
      <Route path="/preview/:token" component={PreviewToken} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Never show the marketing welcome screen on admin portal paths
  const isPortalPath = window.location.pathname.includes("/portal");

  const [showWelcome, setShowWelcome] = useState(
    () => !isPortalPath && !localStorage.getItem("rkz_welcomed"),
  );

  function handleWelcomeDone() {
    localStorage.setItem("rkz_welcomed", "1");
    setShowWelcome(false);
  }

  if (showWelcome) {
    return <WelcomeScreen onComplete={handleWelcomeDone} />;
  }

  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <CmsProvider>
      <PortalAuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <ScreenGuard />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Layout>
                <Router />
              </Layout>
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </LanguageProvider>
      </PortalAuthProvider>
      </CmsProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
