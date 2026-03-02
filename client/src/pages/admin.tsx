import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Users, Settings, Trophy, Plus, Database, Globe, CheckCircle, Clock, BookOpen } from "lucide-react";
import type { State } from "@shared/schema";

type UserSafe = { id: number; name: string; email: string; role: string; stateId: number | null; coachRole: string | null; isActive: boolean };
type BallotWindowAdmin = { id: number; stateId: number; gender: string; ageGroup: string; month: number; year: number; status: string; ballotCount: number };

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const addUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["coach", "director", "admin"]),
  stateId: z.string().optional(),
  coachRole: z.enum(["primary", "alternate"]).optional(),
});
type AddUserForm = z.infer<typeof addUserSchema>;

const addWindowSchema = z.object({
  stateId: z.string().min(1),
  gender: z.enum(["boys", "girls"]),
  ageGroup: z.enum(["8U", "10U", "12U", "14U"]),
  month: z.string().min(1),
  year: z.string().min(1),
});
type AddWindowForm = z.infer<typeof addWindowSchema>;

const statusBadgeClass = (status: string) => {
  const map: Record<string, string> = {
    open: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    published: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`;
};

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [userDialog, setUserDialog] = useState(false);
  const [windowDialog, setWindowDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("users");

  const { data: users = [], isLoading: usersLoading } = useQuery<UserSafe[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.role === "admin",
  });

  const { data: windows = [], isLoading: windowsLoading } = useQuery<BallotWindowAdmin[]>({
    queryKey: ["/api/admin/windows"],
    enabled: user?.role === "admin",
  });

  const { data: stateList = [] } = useQuery<State[]>({ queryKey: ["/api/states"] });

  const addUserForm = useForm<AddUserForm>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { name: "", email: "", password: "", role: "coach", coachRole: "primary" },
  });

  const addWindowForm = useForm<AddWindowForm>({
    resolver: zodResolver(addWindowSchema),
    defaultValues: { gender: "boys", ageGroup: "12U", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) },
  });

  const addUserMutation = useMutation({
    mutationFn: (data: AddUserForm) => apiRequest("POST", "/api/admin/users", {
      ...data,
      stateId: data.stateId ? parseInt(data.stateId) : null,
      coachRole: data.coachRole ?? null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setUserDialog(false);
      addUserForm.reset();
      toast({ title: "User created successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addWindowMutation = useMutation({
    mutationFn: (data: AddWindowForm) => apiRequest("POST", "/api/director/windows", {
      stateId: parseInt(data.stateId),
      gender: data.gender,
      ageGroup: data.ageGroup,
      month: parseInt(data.month),
      year: parseInt(data.year),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/windows"] });
      setWindowDialog(false);
      addWindowForm.reset();
      toast({ title: "Ballot window created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: (windowId: number) => apiRequest("PATCH", `/api/director/windows/${windowId}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/windows"] });
      toast({ title: "Rankings published!" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (authLoading) return <div className="flex items-center justify-center h-full"><Skeleton className="w-32 h-8" /></div>;
  if (!user || user.role !== "admin") { setLocation("/login"); return null; }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="bg-primary px-6 py-8">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-4 h-4 text-primary-foreground opacity-80" />
          <span className="text-primary-foreground/80 text-sm font-medium uppercase tracking-widest">Admin Panel</span>
        </div>
        <h1 className="text-2xl font-bold text-primary-foreground">System Administration</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">Manage all users, ballot windows, and system settings.</p>
      </div>

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="border-card-border">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Users className="w-3 h-3" /> Total Users</p>
            </CardContent>
          </Card>
          <Card className="border-card-border">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stateList.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Globe className="w-3 h-3" /> States</p>
            </CardContent>
          </Card>
          <Card className="border-card-border">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{windows.filter(w => w.status === "open").length}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Open Windows</p>
            </CardContent>
          </Card>
          <Card className="border-card-border">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{windows.filter(w => w.status === "published").length}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Trophy className="w-3 h-3" /> Published</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <TabsList>
              <TabsTrigger value="users" data-testid="admin-tab-users">Users</TabsTrigger>
              <TabsTrigger value="windows" data-testid="admin-tab-windows">Ballot Windows</TabsTrigger>
              <TabsTrigger value="states" data-testid="admin-tab-states">States</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              {activeTab === "users" && (
                <Button size="sm" onClick={() => setUserDialog(true)} data-testid="button-add-user">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add User
                </Button>
              )}
              {activeTab === "windows" && (
                <Button size="sm" onClick={() => setWindowDialog(true)} data-testid="button-add-window">
                  <Plus className="w-3.5 h-3.5 mr-1" /> New Window
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="users">
            <Card className="border-card-border">
              <CardContent className="p-0">
                <div className="rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                        ))
                      ) : users.map(u => (
                        <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                          <TableCell className="font-medium text-sm">{u.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${u.role === "admin" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : u.role === "director" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"}`}>
                              {u.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {stateList.find(s => s.id === u.stateId)?.slug ?? "—"}
                          </TableCell>
                          <TableCell>
                            <span className={u.isActive ? "text-green-600 text-xs font-medium" : "text-red-500 text-xs font-medium"}>
                              {u.isActive ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="windows">
            <Card className="border-card-border">
              <CardContent className="p-0">
                <div className="rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>State</TableHead>
                        <TableHead>Division</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Votes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {windowsLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                        ))
                      ) : windows.map(w => (
                        <TableRow key={w.id} data-testid={`window-row-${w.id}`}>
                          <TableCell className="text-sm font-medium">{stateList.find(s => s.id === w.stateId)?.slug ?? "?"}</TableCell>
                          <TableCell className="text-sm capitalize">{w.gender} {w.ageGroup}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{MONTH_NAMES[(w.month) - 1]} {w.year}</TableCell>
                          <TableCell className="text-sm">{w.ballotCount}/16</TableCell>
                          <TableCell><span className={statusBadgeClass(w.status)}>{w.status}</span></TableCell>
                          <TableCell className="text-right">
                            {w.status === "open" && (
                              <Button size="sm" variant="outline" onClick={() => publishMutation.mutate(w.id)} disabled={publishMutation.isPending} data-testid={`button-publish-${w.id}`}>
                                <BookOpen className="w-3.5 h-3.5 mr-1" /> Publish
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="states">
            <Card className="border-card-border">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {stateList.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-md border border-card-border bg-card" data-testid={`state-card-${s.slug}`}>
                      <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                        {s.slug}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <Form {...addUserForm}>
            <form onSubmit={addUserForm.handleSubmit(d => addUserMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={addUserForm.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} placeholder="Jane Smith" data-testid="input-user-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addUserForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field} type="email" placeholder="jane@example.com" data-testid="input-user-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addUserForm.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input {...field} type="password" placeholder="••••••" data-testid="input-user-password" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addUserForm.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-user-role"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="coach">Coach</SelectItem>
                        <SelectItem value="director">Director</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addUserForm.control} name="stateId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-user-state"><SelectValue placeholder="Select state" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {stateList.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {addUserForm.watch("role") === "coach" && (
                  <FormField control={addUserForm.control} name="coachRole" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coach Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="primary">Primary</SelectItem>
                          <SelectItem value="alternate">Alternate</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setUserDialog(false)} data-testid="button-cancel-user">Cancel</Button>
                <Button type="submit" disabled={addUserMutation.isPending} data-testid="button-confirm-add-user">
                  {addUserMutation.isPending ? "Creating…" : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={windowDialog} onOpenChange={setWindowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Ballot Window</DialogTitle>
          </DialogHeader>
          <Form {...addWindowForm}>
            <form onSubmit={addWindowForm.handleSubmit(d => addWindowMutation.mutate(d))} className="space-y-4">
              <FormField control={addWindowForm.control} name="stateId" render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-window-state"><SelectValue placeholder="Select state" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {stateList.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={addWindowForm.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="boys">Boys</SelectItem>
                        <SelectItem value="girls">Girls</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addWindowForm.control} name="ageGroup" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age Group</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["8U", "10U", "12U", "14U"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addWindowForm.control} name="month" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addWindowForm.control} name="year" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl><Input {...field} type="number" min="2024" max="2030" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setWindowDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={addWindowMutation.isPending} data-testid="button-confirm-add-window">
                  {addWindowMutation.isPending ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
