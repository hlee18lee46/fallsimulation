import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, User, Hash, Trophy } from "lucide-react"
import type { GameSession } from "@/types/game"

interface GameSessionsListProps {
  sessions: GameSession[]
}

export function GameSessionsList({ sessions }: GameSessionsListProps) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Game Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No game sessions yet. Start training to see your progress!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Game Sessions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.map((session) => (
          <GameSessionCard key={session.id} session={session} />
        ))}
      </CardContent>
    </Card>
  )
}

interface GameSessionCardProps {
  session: GameSession
}

function GameSessionCard({ session }: GameSessionCardProps) {
  const maxScore = 300 // Maximum possible score (100 per scenario)
  const scorePercentage = (session.totalScore / maxScore) * 100

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 75) return "text-secondary"
    if (score >= 60) return "text-orange-500"
    return "text-destructive"
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return "default"
    if (score >= 75) return "secondary"
    return "outline"
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header with user info and session ID */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{session.username}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Hash className="h-4 w-4" />
              <span>{session.sessionId}</span>
            </div>
          </div>

          {/* Individual Fall Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Low-Sugar Shock Fall</span>
                <Badge variant={getScoreBadgeVariant(session.scores.lowSugarShockFall)}>
                  {session.scores.lowSugarShockFall}
                </Badge>
              </div>
              <Progress value={session.scores.lowSugarShockFall} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Stroke Fall</span>
                <Badge variant={getScoreBadgeVariant(session.scores.strokeFall)}>{session.scores.strokeFall}</Badge>
              </div>
              <Progress value={session.scores.strokeFall} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Water Slip Fall</span>
                <Badge variant={getScoreBadgeVariant(session.scores.waterSlipFall)}>
                  {session.scores.waterSlipFall}
                </Badge>
              </div>
              <Progress value={session.scores.waterSlipFall} className="h-2" />
            </div>
          </div>

          {/* Total Score and Date */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-secondary" />
              <span className="font-semibold">Total Score:</span>
              <span className={`text-lg font-bold ${getScoreColor(scorePercentage)}`}>{session.totalScore}</span>
              <span className="text-sm text-muted-foreground">/ {maxScore}</span>
            </div>

            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date(session.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Performance</span>
              <span>{Math.round(scorePercentage)}%</span>
            </div>
            <Progress value={scorePercentage} className="h-3" />
          </div>

          {/* Feedback if available */}
          {session.feedback && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-muted-foreground italic">"{session.feedback}"</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
