import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Practice from "@/pages/Practice";
import Leaderboard from "@/pages/Leaderboard";
import Admin from "@/pages/Admin";
import Progress from "@/pages/Progress";
import DailyChallenge from "@/pages/DailyChallenge";
import Challenge from "@/pages/Challenge";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={Auth} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/practice" component={Practice} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/progress" component={Progress} />
      <Route path="/admin" component={Admin} />
      <Route path="/daily-challenge" component={DailyChallenge} />
      <Route path="/versus" component={Challenge} />
      <Route path="/challenge/:code" component={Challenge} />
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
