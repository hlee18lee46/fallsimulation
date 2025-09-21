import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award } from "lucide-react"
import type { LeaderboardEntry } from "@/types/game"

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  currentUserId: string
}

export function Leaderboard({ entries, currentUserId }: LeaderboardProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
    }
  }

  const getRankBadgeVariant = (rank: number) => {
    if (rank <= 3) return "default"
    return "secondary"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-secondary" />
          <span>Leaderboard</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.slice(0, 10).map((entry) => (
            <div
              key={entry.userId}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                entry.userId === currentUserId ? "bg-primary/10 border border-primary/20" : "bg-muted/50 hover:bg-muted"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8">{getRankIcon(entry.rank)}</div>
                <div>
                  <p className={`font-medium ${entry.userId === currentUserId ? "text-primary" : "text-foreground"}`}>
                    {entry.username}
                    {entry.userId === currentUserId && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        You
                      </Badge>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant={getRankBadgeVariant(entry.rank)} className="font-mono">
                  {entry.score}
                </Badge>
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="text-center py-4">
              <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No scores yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
