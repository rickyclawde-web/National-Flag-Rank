import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import SubmitPage from "@/pages/submit";
import LoginPage from "@/pages/login";
import CoachPage from "@/pages/coach";
import DirectorPage from "@/pages/director";
import AdminPage from "@/pages/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/submit" component={SubmitPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/coach" component={CoachPage} />
      <Route path="/director" component={DirectorPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "18rem",
  "--sidebar-width-icon": "3.5rem",
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background sticky top-0 z-50 shrink-0">
                <SidebarTrigger data-testid="button-sidebar-toggle" className="text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-hidden">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
