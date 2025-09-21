"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react"
import type { GameSession } from "@/types/game"

interface ScoreAnalyticsProps {
  sessions: GameSession[]
}

export function ScoreAnalytics({ sessions }: ScoreAnalyticsProps) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Score Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Complete some training sessions to see your analytics!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate analytics
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const scenarioAnalytics = {
    lowSugarShockFall: calculateScenarioStats(sessions, "lowSugarShockFall"),
    strokeFall: calculateScenarioStats(sessions, "strokeFall"),
    waterSlipFall: calculateScenarioStats(sessions, "waterSlipFall"),
  }

  const overallTrend = calculateOverallTrend(sortedSessions)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-primary" />
            <span>Performance Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Overall Trend */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <h3 className="font-semibold">Overall Trend</h3>
                <p className="text-sm text-muted-foreground">Based on your recent sessions</p>
              </div>
              <div className="flex items-center space-x-2">
                {overallTrend.icon}
                <span className={`font-semibold ${overallTrend.color}`}>
                  {overallTrend.change > 0 ? "+" : ""}
                  {overallTrend.change}%
                </span>
              </div>
            </div>

            {/* Scenario Breakdown */}
            <div className="space-y-4">
              <h3 className="font-semibold">Scenario Performance</h3>

              <ScenarioAnalyticsCard
                title="Low-Sugar Shock Fall"
                stats={scenarioAnalytics.lowSugarShockFall}
                color="bg-blue-500"
              />

              <ScenarioAnalyticsCard title="Stroke Fall" stats={scenarioAnalytics.strokeFall} color="bg-green-500" />

              <ScenarioAnalyticsCard
                title="Water Slip Fall"
                stats={scenarioAnalytics.waterSlipFall}
                color="bg-purple-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface ScenarioStats {
  average: number
  best: number
  worst: number
  trend: number
  improvement: number
}

interface ScenarioAnalyticsCardProps {
  title: string
  stats: ScenarioStats
  color: string
}

function ScenarioAnalyticsCard({ title, stats, color }: ScenarioAnalyticsCardProps) {
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-600"
    if (trend < 0) return "text-red-600"
    return "text-muted-foreground"
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <h4 className="font-medium">{title}</h4>
        </div>
        <div className="flex items-center space-x-1">
          {getTrendIcon(stats.trend)}
          <span className={`text-sm font-medium ${getTrendColor(stats.trend)}`}>
            {stats.trend > 0 ? "+" : ""}
            {stats.trend}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Average</p>
          <p className="font-semibold">{stats.average}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Best</p>
          <p className="font-semibold text-green-600">{stats.best}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Worst</p>
          <p className="font-semibold text-red-600">{stats.worst}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Progress to 100</span>
          <span>{stats.average}/100</span>
        </div>
        <Progress value={stats.average} className="h-2" />
      </div>

      {stats.improvement !== 0 && (
        <Badge variant={stats.improvement > 0 ? "default" : "destructive"} className="text-xs">
          {stats.improvement > 0 ? "+" : ""}
          {stats.improvement} points from last session
        </Badge>
      )}
    </div>
  )
}

function calculateScenarioStats(sessions: GameSession[], scenario: keyof GameSession["scores"]): ScenarioStats {
  const scores = sessions.map((s) => s.scores[scenario])
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  const best = Math.max(...scores)
  const worst = Math.min(...scores)

  // Calculate trend (comparing first half vs second half of sessions)
  const midPoint = Math.floor(sortedSessions.length / 2)
  const firstHalf = sortedSessions.slice(0, midPoint).map((s) => s.scores[scenario])
  const secondHalf = sortedSessions.slice(midPoint).map((s) => s.scores[scenario])

  const firstHalfAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length
  const secondHalfAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length

  const trend = firstHalf.length > 0 ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100) : 0

  // Calculate improvement from last session
  const lastScore = sortedSessions[sortedSessions.length - 1]?.scores[scenario] || 0
  const previousScore = sortedSessions[sortedSessions.length - 2]?.scores[scenario] || lastScore
  const improvement = lastScore - previousScore

  return {
    average,
    best,
    worst,
    trend,
    improvement,
  }
}

function calculateOverallTrend(sessions: GameSession[]) {
  if (sessions.length < 2) {
    return {
      change: 0,
      icon: <Minus className="h-4 w-4 text-muted-foreground" />,
      color: "text-muted-foreground",
    }
  }

  const midPoint = Math.floor(sessions.length / 2)
  const firstHalf = sessions.slice(0, midPoint)
  const secondHalf = sessions.slice(midPoint)

  const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.totalScore, 0) / firstHalf.length
  const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.totalScore, 0) / secondHalf.length

  const change = Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)

  if (change > 0) {
    return {
      change,
      icon: <TrendingUp className="h-4 w-4 text-green-600" />,
      color: "text-green-600",
    }
  } else if (change < 0) {
    return {
      change,
      icon: <TrendingDown className="h-4 w-4 text-red-600" />,
      color: "text-red-600",
    }
  } else {
    return {
      change,
      icon: <Minus className="h-4 w-4 text-muted-foreground" />,
      color: "text-muted-foreground",
    }
  }
}
