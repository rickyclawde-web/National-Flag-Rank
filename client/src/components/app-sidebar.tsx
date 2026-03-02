import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Trophy, Send, Users, LayoutDashboard, ShieldCheck, LogOut, LogIn, Flag } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const publicItems = [
  { title: "Rankings", url: "/", icon: Trophy },
  { title: "Submit a Team", url: "/submit", icon: Send },
];

const coachItems = [
  { title: "Coach Dashboard", url: "/coach", icon: LayoutDashboard },
];

const directorItems = [
  { title: "Director Console", url: "/director", icon: ShieldCheck },
];

const adminItems = [
  { title: "Admin Panel", url: "/admin", icon: Users },
];

const roleBadgeColor: Record<string, string> = {
  coach: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  director: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const allItems = [
    ...publicItems,
    ...(user?.role === "coach" || user?.role === "director" || user?.role === "admin" ? coachItems : []),
    ...(user?.role === "director" || user?.role === "admin" ? directorItems : []),
    ...(user?.role === "admin" ? adminItems : []),
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary text-primary-foreground">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight text-sidebar-foreground">Flag Rankings</p>
              <p className="text-xs text-muted-foreground">National Flag Football</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-2 mb-1">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground"}`}>
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {isAuthenticated && user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${roleBadgeColor[user.role] ?? ""}`}>
                  {user.role}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button variant="default" size="sm" className="w-full justify-start gap-2" data-testid="button-login">
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Button>
          </Link>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
