import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: "public" | "coach" | "director" | "admin";
  stateId: number | null;
  coachRole: "primary" | "alternate" | null;
  isActive: boolean;
};

export function useAuth() {
  const { data, isLoading } = useQuery<{ user: AuthUser } | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const [, setLocation] = useLocation();

  const logout = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      setLocation("/login");
    },
  });

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
    logout: logout.mutate,
  };
}
