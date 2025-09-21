import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Target, TrendingUp, Users } from "lucide-react"
import type { UserStats, LeaderboardEntry } from "@/types/game"

interface StatsOverviewProps {
  userStats: UserStats
  leaderboard: LeaderboardEntry[]
}

export function StatsOverview({ userStats, leaderboard }: StatsOverviewProps) {
  const userRank = leaderboard.findIndex((entry) => entry.userId === userStats.userId) + 1
  const overallBestScore = Math.max(...leaderboard.map((entry) => entry.score))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Your Best Score</CardTitle>
          <Trophy className="h-4 w-4 text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{userStats.bestScore}</div>
          <p className="text-xs text-muted-foreground">Personal record</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall Best Score</CardTitle>
          <Target className="h-4 w-4 text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{overallBestScore}</div>
          <p className="text-xs text-muted-foreground">Global record</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Your Rank</CardTitle>
          <Users className="h-4 w-4 text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">#{userRank || "N/A"}</div>
          <p className="text-xs text-muted-foreground">Out of {leaderboard.length} players</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          <TrendingUp className="h-4 w-4 text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{userStats.averageScore}</div>
          <p className="text-xs text-muted-foreground">Across {userStats.totalSessions} sessions</p>
        </CardContent>
      </Card>
    </div>
  )
}
