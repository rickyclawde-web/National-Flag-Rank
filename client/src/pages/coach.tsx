import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, CheckCircle, Clock, Trash2, RotateCcw, Trophy, Users, ClipboardList, ArrowRightLeft, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Submission = {
  id: number; teamId: number; submitterName: string; submitterEmail: string; status: string;
  notes: string | null; createdAt: string;
  team: { id: number; name: string; city: string; clubName: string | null; gender: string; ageGroup: string; stateId: number };
};
type BallotWindow = { id: number; gender: string; ageGroup: string; month: number; year: number; status: string; deadlineAt: string | null; ballotCount?: number };
type BallotStatus = { submitted: boolean; ballot: any };

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const POINTS_MAP: Record<number, number> = { 1:10, 2:9, 3:8, 4:7, 5:6, 6:5, 7:4, 8:3, 9:2, 10:1 };

function SortableTeamCard({ team, rank, onRemove }: { team: Submission; rank: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: team.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-3 p-3 rounded-md border bg-card border-card-border transition-all ${isDragging ? "shadow-md" : ""}`} data-testid={`ballot-item-${team.id}`}>
      <button {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing text-muted-foreground p-1 rounded" data-testid={`drag-handle-${team.id}`}>
        <GripVertical className="w-4 h-4" />
      </button>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${rank <= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{team.team.name}</p>
        <p className="text-xs text-muted-foreground truncate">{team.team.city}{team.team.clubName ? ` · ${team.team.clubName}` : ""}</p>
      </div>
      <div className="text-right shrink-0">
        <span className="text-xs font-medium text-primary">{POINTS_MAP[rank]} pts</span>
      </div>
      <Button size="icon" variant="ghost" onClick={onRemove} className="shrink-0 h-7 w-7 text-muted-foreground" data-testid={`button-remove-${team.id}`}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export default function CoachPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedGender, setSelectedGender] = useState("boys");
  const [selectedAge, setSelectedAge] = useState("12U");
  const [ballotTeams, setBallotTeams] = useState<Submission[]>([]);
  const [ballotWindowId, setBallotWindowId] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; submission: Submission | null }>({ open: false, submission: null });
  const [deleteReason, setDeleteReason] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: pool = [], isLoading: poolLoading, refetch: refetchPool } = useQuery<Submission[]>({
    queryKey: ["/api/coach/pool"],
    enabled: !!user,
  });

  const { data: windows = [], isLoading: windowsLoading } = useQuery<BallotWindow[]>({
    queryKey: ["/api/coach/windows"],
    enabled: !!user,
  });

  const { data: currentWindow, isLoading: windowLoading } = useQuery<BallotWindow & { ballotCount: number }>({
    queryKey: ["/api/coach/windows/current", selectedGender, selectedAge],
    queryFn: () => fetch(`/api/coach/windows/current?gender=${selectedGender}&ageGroup=${selectedAge}`).then(async r => {
      if (!r.ok) return null;
      const d = await r.json();
      setBallotWindowId(d.id);
      return d;
    }),
    enabled: !!user,
    retry: false,
  });

  const { data: ballotStatus } = useQuery<BallotStatus>({
    queryKey: ["/api/coach/ballot-status", ballotWindowId],
    queryFn: () => fetch(`/api/coach/ballot-status?windowId=${ballotWindowId}`).then(r => r.json()),
    enabled: !!ballotWindowId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: number; status: string; reason?: string }) =>
      apiRequest("PATCH", `/api/coach/submissions/${id}`, { status, reason }),
    onSuccess: () => {
      refetchPool();
      setDeleteModal({ open: false, submission: null });
      setDeleteReason("");
      toast({ title: "Status updated", description: "Submission updated successfully." });
    },
  });

  const submitBallotMutation = useMutation({
    mutationFn: (data: { windowId: number; rankings: { teamId: number; rank: number }[] }) =>
      apiRequest("POST", "/api/coach/ballots", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/ballot-status"] });
      toast({ title: "Ballot submitted!", description: "Your rankings have been recorded.", variant: "default" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (authLoading) return <div className="flex items-center justify-center h-full"><Skeleton className="w-32 h-8" /></div>;
  if (!user) { setLocation("/login"); return null; }

  const pendingPool = pool.filter(s => s.status === "pending");
  const filteredPool = pendingPool.filter(s => s.team.gender === selectedGender && s.team.ageGroup === selectedAge);
  const availableForBallot = filteredPool.filter(s => !ballotTeams.find(b => b.id === s.id));

  const addToBallot = (submission: Submission) => {
    if (ballotTeams.length >= 10) {
      toast({ title: "Ballot full", description: "You can rank at most 10 teams.", variant: "destructive" });
      return;
    }
    setBallotTeams(prev => [...prev, submission]);
  };

  const removeFromBallot = (id: number) => {
    setBallotTeams(prev => prev.filter(t => t.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBallotTeams(prev => {
        const oldIdx = prev.findIndex(t => t.id === active.id);
        const newIdx = prev.findIndex(t => t.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const handleSubmitBallot = () => {
    if (!ballotWindowId || ballotTeams.length === 0) return;
    submitBallotMutation.mutate({
      windowId: ballotWindowId,
      rankings: ballotTeams.map((t, i) => ({ teamId: t.team.id, rank: i + 1 })),
    });
  };

  const openDeleteModal = (submission: Submission) => {
    setDeleteModal({ open: true, submission });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="bg-primary px-6 py-8">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="w-4 h-4 text-primary-foreground opacity-80" />
          <span className="text-primary-foreground/80 text-sm font-medium uppercase tracking-widest">Coach Dashboard</span>
        </div>
        <h1 className="text-2xl font-bold text-primary-foreground">Welcome, {user.name}</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">
          Review team submissions and submit your monthly ballot.
          <Badge className="ml-2 bg-white/20 text-white border-0 text-xs capitalize">{user.coachRole ?? "coach"}</Badge>
        </p>
      </div>

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-wrap gap-3 mb-6">
          <Tabs value={selectedGender} onValueChange={(v) => { setSelectedGender(v); setBallotTeams([]); }}>
            <TabsList>
              <TabsTrigger value="boys" data-testid="tab-boys">Boys</TabsTrigger>
              <TabsTrigger value="girls" data-testid="tab-girls">Girls</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={selectedAge} onValueChange={(v) => { setSelectedAge(v); setBallotTeams([]); }}>
            <TabsList>
              {["8U", "10U", "12U", "14U"].map(a => (
                <TabsTrigger key={a} value={a} data-testid={`tab-age-${a}`}>{a}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {currentWindow && (
          <div className={`flex items-center gap-3 p-4 rounded-md border mb-6 ${ballotStatus?.submitted ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800"}`}>
            {ballotStatus?.submitted ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-semibold ${ballotStatus?.submitted ? "text-green-800 dark:text-green-200" : "text-amber-800 dark:text-amber-200"}`}>
                {ballotStatus?.submitted ? "Ballot Submitted" : "Ballot Open"} — {selectedGender === "boys" ? "Boys" : "Girls"} {selectedAge}
              </p>
              <p className={`text-xs mt-0.5 ${ballotStatus?.submitted ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>
                {ballotStatus?.submitted ? "Your vote has been recorded for this cycle." :
                  currentWindow.deadlineAt ? `Deadline: ${new Date(currentWindow.deadlineAt).toLocaleDateString()}` : "Vote before deadline"}
              </p>
            </div>
            <Badge className={`shrink-0 ${ballotStatus?.submitted ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0" : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-0"}`}>
              {currentWindow.ballotCount ?? 0} / 16 votes
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <Card className="border-card-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Submission Pool
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">{filteredPool.length} teams</Badge>
                </div>
                <CardDescription className="text-xs">Click a team to add them to your ballot (max 10).</CardDescription>
              </CardHeader>
              <CardContent>
                {poolLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : filteredPool.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No pending submissions for this division.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {filteredPool.map(s => {
                      const inBallot = ballotTeams.find(b => b.id === s.id);
                      return (
                        <div key={s.id} className={`flex items-center gap-3 p-3 rounded-md border transition-all ${inBallot ? "bg-primary/5 border-primary/30" : "bg-card border-card-border hover-elevate cursor-pointer"}`}
                          onClick={() => !inBallot && addToBallot(s)}
                          data-testid={`pool-item-${s.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{s.team.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{s.team.city}{s.team.clubName ? ` · ${s.team.clubName}` : ""}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {inBallot ? (
                              <Badge variant="secondary" className="text-xs">Added</Badge>
                            ) : (
                              <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); addToBallot(s); }} data-testid={`button-add-${s.id}`}>
                                <ArrowRightLeft className="w-3 h-3 mr-1" /> Add
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); openDeleteModal(s); }} data-testid={`button-delete-${s.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-card-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    Your Ballot
                  </CardTitle>
                  <Badge variant={ballotTeams.length === 10 ? "default" : "secondary"} className="text-xs">{ballotTeams.length} / 10</Badge>
                </div>
                <CardDescription className="text-xs">Drag to reorder. #1 = 10 pts, #10 = 1 pt.</CardDescription>
              </CardHeader>
              <CardContent>
                {ballotStatus?.submitted ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Ballot already submitted</p>
                    <p className="text-xs text-muted-foreground mt-1">Your rankings are locked in for this cycle.</p>
                  </div>
                ) : ballotTeams.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Add teams from the pool to build your ballot.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={ballotTeams.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        {ballotTeams.map((team, idx) => (
                          <SortableTeamCard key={team.id} team={team} rank={idx + 1} onRemove={() => removeFromBallot(team.id)} />
                        ))}
                      </SortableContext>
                    </DndContext>
                    <Separator className="my-3" />
                    <Button
                      className="w-full"
                      onClick={handleSubmitBallot}
                      disabled={ballotTeams.length === 0 || submitBallotMutation.isPending || !currentWindow}
                      data-testid="button-submit-ballot"
                    >
                      {submitBallotMutation.isPending ? "Submitting…" : <><Send className="w-4 h-4 mr-2" /> Submit Ballot</>}
                    </Button>
                    {!currentWindow && (
                      <p className="text-xs text-center text-muted-foreground">No open ballot window for this division.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={deleteModal.open} onOpenChange={(o) => !o && setDeleteModal({ open: false, submission: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Submission</DialogTitle>
            <DialogDescription>
              Remove <strong>{deleteModal.submission?.team.name}</strong> from the pool? This can be restored by a director.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Reason for removal (optional)"
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              rows={2}
              data-testid="textarea-delete-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal({ open: false, submission: null })} data-testid="button-cancel-delete">Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (deleteModal.submission) {
                updateStatusMutation.mutate({ id: deleteModal.submission.id, status: "deleted", reason: deleteReason });
              }
            }} disabled={updateStatusMutation.isPending} data-testid="button-confirm-delete">
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
