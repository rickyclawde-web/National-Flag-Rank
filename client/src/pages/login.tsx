import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Flag, Lock, Mail, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) => apiRequest("POST", "/api/auth/login", data),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.setQueryData(["/api/auth/me"], data);
      const role = data.user.role;
      if (role === "admin") setLocation("/admin");
      else if (role === "director") setLocation("/director");
      else if (role === "coach") setLocation("/coach");
      else setLocation("/");
    },
    onError: (err: Error) => {
      setError(err.message.includes("401") ? "Invalid email or password" : err.message);
    },
  });

  return (
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary text-primary-foreground mb-4 shadow-lg">
            <Flag className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Flag Rankings</h1>
          <p className="text-muted-foreground mt-1">National Flag Football Rankings System</p>
        </div>

        <Card className="border-card-border shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => loginMutation.mutate(d))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="you@example.com"
                            className="pl-9"
                            data-testid="input-email"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="password"
                            placeholder="••••••••"
                            className="pl-9"
                            data-testid="input-password"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-submit-login"
                >
                  {loginMutation.isPending ? "Signing in…" : "Sign In"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 p-4 bg-muted rounded-md">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Demo Accounts</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span className="font-medium">Admin:</span>
                  <span>admin@flagrankings.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Director:</span>
                  <span>director.tx@flagrankings.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Coach:</span>
                  <span>coach1.tx@flagrankings.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Password:</span>
                  <span>password123</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
