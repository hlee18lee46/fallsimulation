export interface GameSession {
  id: string
  username: string
  userId: string
  sessionId: string
  scores: {
    lowSugarShockFall: number
    strokeFall: number
    waterSlipFall: number
  }
  totalScore: number
  createdAt: string
  feedback?: string
}

export interface UserStats {
  userId: string
  username: string
  bestScore: number
  totalSessions: number
  averageScore: number
}

export interface LeaderboardEntry {
  rank: number
  username: string
  score: number
  userId: string
}
