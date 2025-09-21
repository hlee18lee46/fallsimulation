"use client";

import { useAuth } from "@/lib/auth0";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchUserGameSessions, fetchUserStats, fetchLeaderboard } from "@/lib/api";
import type { GameSession, UserStats, LeaderboardEntry } from "@/types/game";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { GameSessionsList } from "@/components/dashboard/game-sessions-list";
import { Leaderboard } from "@/components/dashboard/leaderboard";
import { FeedbackSection } from "@/components/dashboard/feedback-section";
import { ScoreAnalytics } from "@/components/dashboard/score-analytics";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect unauthenticated users once auth state is known
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/"); // no flicker, no "window"
    }
  }, [isLoading, user, router]);

  // Load dashboard data once we have a user
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        setLoading(true);
        const [sessions, stats, leaderboardData] = await Promise.all([
          fetchUserGameSessions(user.sub),
          fetchUserStats(user.sub),
          fetchLeaderboard(),
        ]);
        setGameSessions(sessions);
        setUserStats(stats);
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // While determining auth OR fetching data for an authed user
  if (isLoading || (user && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  // If unauthenticated, we triggered a redirect; render nothing
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {userStats && <StatsOverview userStats={userStats} leaderboard={leaderboard} />}

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <GameSessionsList sessions={gameSessions} />
              <ScoreAnalytics sessions={gameSessions} />
            </div>

            <div className="space-y-6">
              <Leaderboard entries={leaderboard} currentUserId={user.sub} />
              <FeedbackSection sessions={gameSessions} onFeedbackSubmit={() => {
                // refresh data after feedback submit
                // optional: you can factor this into a function if you prefer
                if (!user) return;
                (async () => {
                  try {
                    setLoading(true);
                    const [sessions, stats, leaderboardData] = await Promise.all([
                      fetchUserGameSessions(user.sub),
                      fetchUserStats(user.sub),
                      fetchLeaderboard(),
                    ]);
                    setGameSessions(sessions);
                    setUserStats(stats);
                    setLeaderboard(leaderboardData);
                  } finally {
                    setLoading(false);
                  }
                })();
              }} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
