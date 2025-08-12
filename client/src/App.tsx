import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import RequestPanel from "@/pages/RequestPanel";
import RegistrarPanel from "@/pages/RegistrarPanel";
import UnifiedPanel from "@/pages/UnifiedPanel";
import StatusQuery from "@/pages/StatusQuery";
import DatabaseSetup from "@/pages/DatabaseSetup";
import MobilePanelWorking from "@/pages/MobilePanelWorking";

function DatabaseCheck({ children }: { children: any }) {
  return <>{children}</>;
}

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const isMobile = useMobileDetection();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/status" component={StatusQuery} />
        <Route path="/mobile-requests" component={MobilePanelWorking} />
        <Route path="/database-setup" component={DatabaseSetup} />
        <Route path="/config-banco" component={DatabaseSetup} />
        <Route path="/configuracao-banco" component={DatabaseSetup} />
        <Route path="/" component={Landing} />
        <Route>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">404</h1>
              <p className="text-gray-600">Página não encontrada</p>
            </div>
          </div>
        </Route>
      </Switch>
    );
  }

  const userRole = (user as any)?.role;

  return (
    <Switch>
      <Route path="/mobile-requests" component={MobilePanelWorking} />
      <Route path="/status" component={StatusQuery} />
      <Route path="/database-setup" component={DatabaseSetup} />
      <Route path="/config-banco" component={DatabaseSetup} />
      <Route path="/configuracao-banco" component={DatabaseSetup} />
      <Route path="/admin">
        {userRole === 'admin' && <UnifiedPanel />}
        {userRole !== 'admin' && (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
              <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
            </div>
          </div>
        )}
      </Route>
      <Route path="/">
        {userRole === 'recepcao' && isMobile && <MobilePanelWorking />}
        {userRole === 'recepcao' && !isMobile && <RequestPanel />}
        {userRole === 'regulacao' && <RegistrarPanel />}
        {userRole === 'admin' && <UnifiedPanel />}
        {!userRole && (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        )}
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DatabaseCheck>
          <Router />
        </DatabaseCheck>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}