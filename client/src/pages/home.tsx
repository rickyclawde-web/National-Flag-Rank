import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, MapPin, Users, Medal } from "lucide-react";
import type { State } from "@shared/schema";

type RankingEntry = {
  id: number;
  windowId: number;
  teamId: number;
  totalPoints: number;
  rank: number;
  publishedAt: string;
  team: { id: number; name: string; city: string; clubName: string | null; gender: string; ageGroup: string; stateId: number };
  window: { id: number; stateId: number; gender: string; ageGroup: string; month: number; year: number; status: string };
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const rankColors: Record<number, string> = {
  1: "text-yellow-500",
  2: "text-slate-400",
  3: "text-amber-600",
};

const rankBg: Record<number, string> = {
  1: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800",
  2: "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700",
  3: "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
};

function RankCard({ entry }: { entry: RankingEntry }) {
  const isTop3 = entry.rank <= 3;
  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-md border transition-all hover-elevate ${isTop3 ? rankBg[entry.rank] : "bg-card border-card-border"}`}
      data-testid={`card-ranking-${entry.id}`}
    >
      <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg shrink-0 ${isTop3 ? rankColors[entry.rank] : "text-muted-foreground"}`}>
        {entry.rank === 1 ? <Trophy className="w-6 h-6 fill-current" /> :
         entry.rank === 2 ? <Medal className="w-5 h-5 fill-current" /> :
         entry.rank === 3 ? <Medal className="w-5 h-5 fill-current" /> :
         <span className="text-base">{entry.rank}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-base truncate" data-testid={`text-team-name-${entry.id}`}>{entry.team.name}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" /> {entry.team.city}
          </span>
          {entry.team.clubName && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" /> {entry.team.clubName}
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1.5 justify-end">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span className="font-bold text-foreground text-lg" data-testid={`text-points-${entry.id}`}>{entry.totalPoints}</span>
        </div>
        <p className="text-xs text-muted-foreground">points</p>
      </div>
    </div>
  );
}

function RankingsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-md border border-card-border">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [selectedState, setSelectedState] = useState("TX");
  const [selectedGender, setSelectedGender] = useState("boys");
  const [selectedAge, setSelectedAge] = useState("12U");

  const { data: stateList = [] } = useQuery<State[]>({ queryKey: ["/api/states"] });

  const { data: rankings = [], isLoading } = useQuery<RankingEntry[]>({
    queryKey: ["/api/rankings", selectedState, selectedGender, selectedAge],
    queryFn: () => fetch(`/api/rankings?state=${selectedState}&gender=${selectedGender}&ageGroup=${selectedAge}`).then(r => r.json()),
  });

  const latestWindow = rankings[0]?.window;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="relative bg-primary px-6 py-10 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,.3) 40px, rgba(255,255,255,.3) 80px)"}}>
        </div>
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-primary-foreground opacity-80" />
            <span className="text-primary-foreground/80 text-sm font-medium uppercase tracking-widest">National Rankings</span>
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground mb-1">Flag Football Power Rankings</h1>
          <p className="text-primary-foreground/70 text-sm">
            Monthly coach-voted rankings for youth flag football across 12 states.
          </p>
          {latestWindow && (
            <Badge className="mt-3 bg-white/20 text-white border-0 text-xs">
              {MONTH_NAMES[latestWindow.month - 1]} {latestWindow.year} Rankings
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 max-w-3xl w-full mx-auto">
        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-40" data-testid="select-state">
              <MapPin className="w-4 h-4 mr-1 text-muted-foreground" />
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {stateList.map(s => (
                <SelectItem key={s.slug} value={s.slug} data-testid={`option-state-${s.slug}`}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={selectedGender} onValueChange={setSelectedGender}>
            <TabsList>
              <TabsTrigger value="boys" data-testid="tab-boys">Boys</TabsTrigger>
              <TabsTrigger value="girls" data-testid="tab-girls">Girls</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs value={selectedAge} onValueChange={setSelectedAge}>
            <TabsList>
              {["8U", "10U", "12U", "14U"].map(a => (
                <TabsTrigger key={a} value={a} data-testid={`tab-age-${a}`}>{a}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                Top 10 Rankings — {selectedState} {selectedGender === "boys" ? "Boys" : "Girls"} {selectedAge}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">{rankings.length} teams</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <RankingsSkeleton />
            ) : rankings.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-semibold text-foreground mb-1">No rankings published yet</p>
                <p className="text-sm text-muted-foreground">Rankings will appear here once coaches have submitted their ballots and a director publishes results.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rankings.map(r => <RankCard key={r.id} entry={r} />)}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-card-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">12</p>
              <p className="text-sm text-muted-foreground mt-0.5">States</p>
            </CardContent>
          </Card>
          <Card className="border-card-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">8</p>
              <p className="text-sm text-muted-foreground mt-0.5">Divisions</p>
            </CardContent>
          </Card>
          <Card className="border-card-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">16</p>
              <p className="text-sm text-muted-foreground mt-0.5">Coaches / State</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
