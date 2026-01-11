import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import RunnerDetail from "@/pages/RunnerDetail";
import OrderDetail from "@/pages/OrderDetail";
import Evidences from "@/pages/Evidences";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/runners" component={Dashboard} />
      <Route path="/runners/:id" component={RunnerDetail} />
      <Route path="/orders/:id" component={OrderDetail} />
      <Route path="/evidences" component={Evidences} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
