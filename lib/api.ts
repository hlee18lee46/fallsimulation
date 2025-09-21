import type { GameSession, UserStats, LeaderboardEntry } from "@/types/game"

// Mock data for development - replace with actual MongoDB API calls
const mockGameSessions: GameSession[] = [
  {
    id: "1",
    username: "John Doe",
    userId: "auth0|123456789",
    sessionId: "session_001",
    scores: {
      lowSugarShockFall: 85,
      strokeFall: 92,
      waterSlipFall: 78,
    },
    totalScore: 255,
    createdAt: "2024-01-15T10:30:00Z",
    feedback: "Great improvement in stroke fall scenario!",
  },
  {
    id: "2",
    username: "John Doe",
    userId: "auth0|123456789",
    sessionId: "session_002",
    scores: {
      lowSugarShockFall: 88,
      strokeFall: 89,
      waterSlipFall: 82,
    },
    totalScore: 259,
    createdAt: "2024-01-16T14:20:00Z",
    feedback: "Consistent performance across all scenarios.",
  },
  {
    id: "3",
    username: "Jane Smith",
    userId: "auth0|987654321",
    sessionId: "session_003",
    scores: {
      lowSugarShockFall: 95,
      strokeFall: 94,
      waterSlipFall: 91,
    },
    totalScore: 280,
    createdAt: "2024-01-17T09:15:00Z",
    feedback: "Excellent performance! Top scorer this week.",
  },
]

export async function fetchUserGameSessions(userId: string): Promise<GameSession[]> {
  // In production, this would be an API call to your MongoDB backend
  // const response = await fetch(`/api/game-sessions?userId=${userId}`);
  // return response.json();

  return mockGameSessions.filter((session) => session.userId === userId)
}

export async function fetchUserStats(userId: string): Promise<UserStats> {
  // In production, this would be an API call to your MongoDB backend
  const userSessions = await fetchUserGameSessions(userId)
  const bestScore = Math.max(...userSessions.map((s) => s.totalScore))
  const averageScore = userSessions.reduce((sum, s) => sum + s.totalScore, 0) / userSessions.length

  return {
    userId,
    username: userSessions[0]?.username || "Unknown",
    bestScore,
    totalSessions: userSessions.length,
    averageScore: Math.round(averageScore),
  }
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  // In production, this would be an API call to your MongoDB backend
  const allSessions = mockGameSessions
  const userBestScores = new Map<string, { username: string; score: number }>()

  allSessions.forEach((session) => {
    const current = userBestScores.get(session.userId)
    if (!current || session.totalScore > current.score) {
      userBestScores.set(session.userId, {
        username: session.username,
        score: session.totalScore,
      })
    }
  })

  return Array.from(userBestScores.entries())
    .map(([userId, data], index) => ({
      rank: index + 1,
      userId,
      username: data.username,
      score: data.score,
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
}

export async function submitFeedback(sessionId: string, feedback: string): Promise<void> {
  // In production, this would be an API call to your MongoDB backend
  // await fetch(`/api/feedback`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ sessionId, feedback })
  // });

  console.log("Feedback submitted:", { sessionId, feedback })
}
