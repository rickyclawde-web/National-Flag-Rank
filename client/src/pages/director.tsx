import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Users, Trophy, ClipboardList, CheckCircle, Clock, AlertTriangle, Eye, RefreshCw, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type Coach = { id: number; name: string; email: string; role: string; stateId: number | null; coachRole: string | null; isActive: boolean };
type BallotWindow = { id: number; gender: string; ageGroup: string; month: number; year: number; status: string; deadlineAt: string | null; ballotCount: number };
type Submission = {
  id: number; status: string; submitterName: string; notes: string | null; createdAt: string;
  team: { id: number; name: string; city: string; clubName: string | null; gender: string; ageGroup: string };
};
type Dashboard = { coaches: Coach[]; windows: BallotWindow[]; submissions: Submission[] };

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    open: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    published: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    deleted: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`;
};

export default function DirectorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [publishModal, setPublishModal] = useState<{ open: boolean; window: BallotWindow | null }>({ open: false, window: null });
  const [activeTab, setActiveTab] = useState("overview");

  const { data: dashboard, isLoading } = useQuery<Dashboard>({
    queryKey: ["/api/director/dashboard"],
    enabled: !!user && (user.role === "director" || user.role === "admin"),
  });

  const publishMutation = useMutation({
    mutationFn: (windowId: number) => apiRequest("PATCH", `/api/director/windows/${windowId}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/dashboard"] });
      setPublishModal({ open: false, window: null });
      toast({ title: "Rankings published!", description: "Results are now live on the public portal." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/coach/submissions/${id}`, { status: "pending" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/dashboard"] });
      toast({ title: "Submission restored" });
    },
  });

  if (authLoading) return <div className="flex items-center justify-center h-full"><Skeleton className="w-32 h-8" /></div>;
  if (!user || (user.role !== "director" && user.role !== "admin")) {
    setLocation("/login");
    return null;
  }

  const openWindows = dashboard?.windows.filter(w => w.status === "open") ?? [];
  const publishedWindows = dashboard?.windows.filter(w => w.status === "published") ?? [];
  const deletedSubs = dashboard?.submissions.filter(s => s.status === "deleted") ?? [];
  const primaryCoaches = dashboard?.coaches.filter(c => c.coachRole === "primary" && c.role === "coach") ?? [];
  const altCoaches = dashboard?.coaches.filter(c => c.coachRole === "alternate" && c.role === "coach") ?? [];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="bg-primary px-6 py-8">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-primary-foreground opacity-80" />
          <span className="text-primary-foreground/80 text-sm font-medium uppercase tracking-widest">Director Console</span>
        </div>
        <h1 className="text-2xl font-bold text-primary-foreground">{user.name}'s Dashboard</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">Manage ballots, coaches, and publish rankings for your state.</p>
      </div>

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="border-card-border">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{openWindows.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Open Windows</p>
            </CardContent>
          </Card>
          <Card className="border-card-border">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{primaryCoaches.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Users className="w-3 h-3" /> Primary Coaches</p>
            </CardContent>
          </Card>
          <Card className="border-card-border">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{dashboard?.submissions.filter(s => s.status === "pending").length ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><ClipboardList className="w-3 h-3" /> Pending Subs</p>
            </CardContent>
          </Card>
          <Card className="border-card-border">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{publishedWindows.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Trophy className="w-3 h-3" /> Published</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview" data-testid="tab-overview">Ballot Windows</TabsTrigger>
            <TabsTrigger value="coaches" data-testid="tab-coaches">Coaches</TabsTrigger>
            <TabsTrigger value="deleted" data-testid="tab-deleted">
              Deleted Submissions
              {deletedSubs.length > 0 && <Badge className="ml-1.5 text-xs">{deletedSubs.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ballot Windows</CardTitle>
                <CardDescription className="text-xs">Monitor voting status and publish rankings when ready.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                ) : (dashboard?.windows.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No ballot windows found.</p>
                ) : (
                  <div className="rounded-md border border-card-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Division</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Votes</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboard?.windows.map(w => (
                          <TableRow key={w.id} data-testid={`window-row-${w.id}`}>
                            <TableCell className="font-medium text-sm">{w.gender === "boys" ? "Boys" : "Girls"} {w.ageGroup}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{MONTH_NAMES[(w.month) - 1]} {w.year}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 max-w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (w.ballotCount / 16) * 100)}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{w.ballotCount}/16</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={statusBadge(w.status)}>{w.status}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              {w.status === "open" && (
                                <Button size="sm" variant="outline" onClick={() => setPublishModal({ open: true, window: w })} data-testid={`button-publish-${w.id}`}>
                                  <BookOpen className="w-3.5 h-3.5 mr-1" /> Publish
                                </Button>
                              )}
                              {w.status === "published" && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Published</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coaches">
            <Card className="border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Coach Roster</CardTitle>
                <CardDescription className="text-xs">Primary and alternate coaches for your state.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (
                  <div className="rounded-md border border-card-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboard?.coaches.filter(c => c.role === "coach").map(c => (
                          <TableRow key={c.id} data-testid={`coach-row-${c.id}`}>
                            <TableCell className="font-medium text-sm">{c.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{c.email}</TableCell>
                            <TableCell>
                              <span className={statusBadge(c.coachRole ?? "primary")}>{c.coachRole ?? "primary"}</span>
                            </TableCell>
                            <TableCell>
                              <span className={c.isActive ? "text-green-600 text-xs font-medium" : "text-red-500 text-xs font-medium"}>
                                {c.isActive ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(dashboard?.coaches.filter(c => c.role === "coach").length ?? 0) === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">No coaches assigned to this state.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deleted">
            <Card className="border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Deleted Submissions</CardTitle>
                <CardDescription className="text-xs">Review and restore removed team nominations.</CardDescription>
              </CardHeader>
              <CardContent>
                {deletedSubs.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-8 h-8 text-green-500/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No deleted submissions.</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-card-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team</TableHead>
                          <TableHead>Division</TableHead>
                          <TableHead>Submitted By</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deletedSubs.map(s => (
                          <TableRow key={s.id} data-testid={`deleted-row-${s.id}`}>
                            <TableCell className="font-medium text-sm">{s.team.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground capitalize">{s.team.gender} {s.team.ageGroup}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{s.submitterName}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => restoreMutation.mutate(s.id)} disabled={restoreMutation.isPending} data-testid={`button-restore-${s.id}`}>
                                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Restore
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={publishModal.open} onOpenChange={(o) => !o && setPublishModal({ open: false, window: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Publish Rankings
            </DialogTitle>
            <DialogDescription>
              This will tally all submitted ballots for <strong>{publishModal.window?.gender === "boys" ? "Boys" : "Girls"} {publishModal.window?.ageGroup}</strong> and publish the top 10 to the public rankings page.
              <br /><br />
              Current votes: <strong>{publishModal.window?.ballotCount ?? 0} / 16</strong>
              <br /><br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishModal({ open: false, window: null })} data-testid="button-cancel-publish">Cancel</Button>
            <Button onClick={() => publishMutation.mutate(publishModal.window!.id)} disabled={publishMutation.isPending} data-testid="button-confirm-publish">
              {publishMutation.isPending ? "Publishing…" : <><BookOpen className="w-4 h-4 mr-2" /> Publish Now</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
