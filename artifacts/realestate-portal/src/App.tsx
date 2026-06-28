import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import { LanguageProvider } from "@/lib/i18n";
import { Layout } from "@/components/layout";
import { Home } from "@/pages/home";
import { ListingsBrowser } from "@/pages/listings";
import { ListingDetail } from "@/pages/listing-detail";
import { Services } from "@/pages/services";
import { Contact } from "@/pages/contact";
import { About } from "@/pages/about";
import { ServiceDetail } from "@/pages/service-detail";
import { PortalAuthProvider } from "@/lib/portal-auth";
import { CmsProvider } from "@/lib/cms-context";
import { PortalLogin } from "@/pages/portal-login";
import { PortalDashboard } from "@/pages/portal-dashboard";
import { Join } from "@/pages/join";
import { GetStarted } from "@/pages/get-started";
import { PortalRegister } from "@/pages/portal-register";
import { BuyerDashboard } from "@/pages/buyer-dashboard";
import { PreviewToken } from "@/pages/preview-token";
import { Privacy } from "@/pages/privacy";
import { Terms } from "@/pages/terms";
// ── New Zillow-style pages ──────────────────────────────────────────────────────
import { SearchPage } from "@/pages/search";
import { PropertyDetail } from "@/pages/property-detail";
import { Favorites } from "@/pages/favorites";
import { Updates } from "@/pages/updates";
import { Financing } from "@/pages/financing";
import { Agents } from "@/pages/agents";
import { Sell } from "@/pages/sell";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 300_000,
    },
  },
});

function ScrollToTop() {
  const [loc] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc]);
  return null;
}

function Router() {
  return (
    <Switch>
      {/* ── Public Zillow-style routes ──────────────────────────────────────── */}
      <Route path="/" component={Home} />
      <Route path="/search" component={SearchPage} />
      <Route path="/property/:id" component={PropertyDetail} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/updates" component={Updates} />
      <Route path="/financing" component={Financing} />
      <Route path="/agents" component={Agents} />
      <Route path="/sell" component={Sell} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      {/* ── Legacy redirects ────────────────────────────────────────────────── */}
      <Route path="/listings" component={ListingsBrowser} />
      <Route path="/listings/:id" component={ListingDetail} />
      <Route path="/services" component={Services} />
      <Route path="/services/:slug" component={ServiceDetail} />
      {/* ── Portal (admin) routes ───────────────────────────────────────────── */}
      <Route path="/join" component={Join} />
      <Route path="/get-started" component={GetStarted} />
      <Route path="/portal/register" component={PortalRegister} />
      <Route path="/portal/buyer" component={BuyerDashboard} />
      <Route path="/portal" component={PortalLogin} />
      <Route path="/portal/dashboard" component={PortalDashboard} />
      <Route path="/preview/:token" component={PreviewToken} />
      {/* ── Legal ───────────────────────────────────────────────────────────── */}
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CmsProvider>
        <PortalAuthProvider>
          <LanguageProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <ScrollToTop />
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
  );
}

export default App;
