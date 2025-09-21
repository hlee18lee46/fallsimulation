// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { db } from "@/lib/mongodb";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, LogOut, Target, Zap } from "lucide-react";

type SessionDoc = {
  _id: any;
  email: string;
  scores: { saved: number; lost: number; total: number };
  timeRemainingSeconds?: number | null;
  gameDurationSeconds?: number | null;
  endedReason?: string | null;
  sessionId?: string | null;
  scenario?: string | null;
  metadata?: Record<string, any>;
  createdAt?: string | Date;
  userAgent?: string | null;
};

function pct(saved: number, total: number) {
  if (!total) return 0;
  return Math.round((saved / total) * 100);
}

export default async function DashboardPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const database = await db();
  const col = database.collection<SessionDoc>("game_sessions");

  // --- Fetch recent (last 10) for this user, hide password ---
  const recent = await col
    .find(
      { email: session.email },
      { projection: { password: 0 } }
    )
    .sort({ createdAt: -1, _id: -1 })
    .limit(10)
    .toArray();

  // --- KPI aggregation ---
  const agg = await col
    .aggregate<{
      totalSessions: number;
      totalSaved: number;
      totalLost: number;
      bestScorePct: number;
    }>([
      { $match: { email: session.email } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalSaved: { $sum: "$scores.saved" },
          totalLost: { $sum: "$scores.lost" },
          bestScorePct: {
            $max: {
              $cond: [
                { $gt: ["$scores.total", 0] },
                { $round: [{ $multiply: [{ $divide: ["$scores.saved", "$scores.total"] }, 100] }, 0] },
                0,
              ],
            },
          },
        },
      },
    ])
    .toArray();

  const k = agg[0] || { totalSessions: 0, totalSaved: 0, totalLost: 0, bestScorePct: 0 };
  const weeklyProgress = Math.min(100, k.totalSessions * 10); // demo heuristic; replace with real weekly calc

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/40 via-background to-muted p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Your Training Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, <span className="font-medium">{session.email}</span>.
            </p>
          </div>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="destructive" className="gap-2">
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </form>
        </div>

        {/* Hero / Progress */}
        <div className="rounded-2xl border bg-card p-6 md:p-8">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full">CPR & Emergency Readiness</Badge>
          </div>
          <h2 className="mt-3 text-2xl md:text-3xl font-semibold">
            Practice scenarios. Track progress. <span className="text-primary">Save lives.</span>
          </h2>
          <p className="text-muted-foreground mt-2">
            Live data below reflects your Unity game submissions.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr,auto]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Weekly Progress</span>
                <span className="text-sm font-medium">{weeklyProgress}%</span>
              </div>
              <Progress value={weeklyProgress} className="mt-2" />
            </div>
            <div className="flex gap-3">
              <Button className="gap-2">
                <Zap className="h-4 w-4" />
                Start New Scenario
              </Button>
              <Button variant="outline" className="gap-2">
                <Target className="h-4 w-4" />
                Training Planner
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Sessions
              </CardTitle>
              <CardDescription>Total submissions</CardDescription>
            </CardHeader>
            <CardContent><div className="text-4xl font-bold">{k.totalSessions}</div></CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Saved / Lost</CardTitle>
              <CardDescription>Cumulative counts</CardDescription>
            </CardHeader>
            <CardContent className="flex items-baseline gap-2">
              <div className="text-4xl font-bold">{k.totalSaved}</div>
              <span className="text-muted-foreground">/ {k.totalLost}</span>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Best Score</CardTitle>
              <CardDescription>Max saved%</CardDescription>
            </CardHeader>
            <CardContent><div className="text-4xl font-bold">{k.bestScorePct}</div></CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Latest Result</CardTitle>
              <CardDescription>From your most recent session</CardDescription>
            </CardHeader>
            <CardContent>
              {recent.length ? (
                <>
                  <div className="text-lg font-medium">
                    {pct(recent[0].scores.saved, recent[0].scores.total)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {recent[0].endedReason ?? "—"} ·{" "}
                    {recent[0].createdAt ? new Date(recent[0].createdAt).toLocaleString() : "—"}
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">No data yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest training results</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="grid grid-cols-12 px-6 pb-2 text-xs text-muted-foreground">
              <div className="col-span-6">Scenario / Reason</div>
              <div className="col-span-2">Saved/Lost</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-2">When</div>
            </div>
            {recent.length === 0 ? (
              <div className="px-6 pb-6 text-sm text-muted-foreground">No submissions yet.</div>
            ) : (
              <div className="divide-y">
                {recent.map((r) => {
                  const score = pct(r.scores.saved, r.scores.total);
                  const when = r.createdAt ? new Date(r.createdAt).toLocaleString() : "—";
                  const label = r.scenario || r.endedReason || "Session";
                  return (
                    <div key={String(r._id)} className="grid grid-cols-12 items-center px-6 py-3 hover:bg-muted/40 transition-colors">
                      <div className="col-span-6 font-medium">{label}</div>
                      <div className="col-span-2">{r.scores.saved} / {r.scores.lost}</div>
                      <div className="col-span-2">{score}%</div>
                      <div className="col-span-2 text-muted-foreground">{when}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}