import { HelmetProvider } from "react-helmet-async";
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
import { PortalRegister } from "@/pages/portal-register";
import { PortalDashboard } from "@/pages/portal-dashboard";
import { Join } from "@/pages/join";
import { BuyerDashboard } from "@/pages/buyer-dashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
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
      <Route path="/contact" component={Contact} />
      <Route path="/join" component={Join} />
      <Route path="/portal" component={PortalLogin} />
      <Route path="/portal/register" component={PortalRegister} />
      <Route path="/portal/dashboard" component={PortalDashboard} />
      <Route path="/portal/buyer" component={BuyerDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <CmsProvider>
      <PortalAuthProvider>
        <LanguageProvider>
          <TooltipProvider>
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
