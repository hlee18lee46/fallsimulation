"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, Send, CheckCircle } from "lucide-react"
import { submitFeedback } from "@/lib/api"
import type { GameSession } from "@/types/game"
import { useToast } from "@/hooks/use-toast"

interface FeedbackSectionProps {
  sessions: GameSession[]
  onFeedbackSubmit: () => void
}

export function FeedbackSection({ sessions, onFeedbackSubmit }: FeedbackSectionProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>("")
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmitFeedback = async () => {
    if (!selectedSessionId || !feedback.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a session and provide feedback.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      await submitFeedback(selectedSessionId, feedback.trim())

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! It helps improve the training experience.",
      })

      setFeedback("")
      setSelectedSessionId("")
      onFeedbackSubmit()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const availableSessions = sessions.filter((session) => !session.feedback)

  return (
    <div className="space-y-6">
      {/* Submit New Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span>Submit Feedback</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableSessions.length > 0 ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Session</label>
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a training session" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSessions.map((session) => (
                      <SelectItem key={session.id} value={session.sessionId}>
                        {session.sessionId} - Score: {session.totalScore} (
                        {new Date(session.createdAt).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Your Feedback</label>
                <Textarea
                  placeholder="Share your thoughts about the training session, difficulty level, realism, or suggestions for improvement..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSubmitFeedback}
                disabled={isSubmitting || !selectedSessionId || !feedback.trim()}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="text-center py-6">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                All your sessions have feedback! Complete more training to provide additional feedback.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions
              .filter((session) => session.feedback)
              .slice(0, 3)
              .map((session) => (
                <div key={session.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {session.sessionId}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground italic">"{session.feedback}"</p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>Score: {session.totalScore}</span>
                  </div>
                </div>
              ))}

            {sessions.filter((session) => session.feedback).length === 0 && (
              <div className="text-center py-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No feedback submitted yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Feedback Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>• Share your experience with scenario realism</p>
            <p>• Suggest improvements for training effectiveness</p>
            <p>• Report any technical issues or bugs</p>
            <p>• Mention difficulty level and learning curve</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
