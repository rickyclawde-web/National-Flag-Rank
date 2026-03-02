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
              <header className="relative flex items-center justify-between px-4 sm:px-6 py-3 bg-gradient-to-r from-[#0E1A3A] via-[#15264E] to-[#D7263D] text-white shadow-lg sticky top-0 z-50 shrink-0">
                <div className="flex items-center gap-3">
                  <SidebarTrigger data-testid="button-sidebar-toggle" className="text-white/80 hover:text-white" />
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-white/70">Go Team Sports</p>
                    <p className="text-xl font-semibold leading-tight">National Flag Rankings</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden md:block text-xs uppercase tracking-wide text-white/70">Dark Mode</span>
                  <ThemeToggle className="bg-white/15 hover:bg-white/25 text-white border-white/20" />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
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
