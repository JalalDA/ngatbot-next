import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { Navigation } from "@/components/navigation";
import LandingPage from "@/pages/landing-page";
import AuthPage from "@/pages/auth-page";
import OverviewDashboard from "@/pages/overview-dashboard";
import MyBotsPage from "@/pages/my-bots-page";
import SmmServicesPage from "@/pages/smm-services-page";
import ProfilePage from "@/pages/profile-page";
import AdminPage from "@/pages/admin-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/ilmiadmin" component={AdminPage} />
      <ProtectedRoute 
        path="/dashboard" 
        component={() => (
          <>
            <Navigation />
            <OverviewDashboard />
          </>
        )} 
      />
      <ProtectedRoute 
        path="/bots" 
        component={() => (
          <>
            <Navigation />
            <MyBotsPage />
          </>
        )} 
      />
      <ProtectedRoute 
        path="/smm" 
        component={() => (
          <>
            <Navigation />
            <SmmServicesPage />
          </>
        )} 
      />
      <ProtectedRoute 
        path="/profile" 
        component={() => (
          <>
            <Navigation />
            <ProfilePage />
          </>
        )} 
      />
      <Route path="/" component={LandingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
