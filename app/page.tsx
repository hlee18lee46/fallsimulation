// app/page.tsx  (Server Component – no "use client")
import { getSessionFromCookies } from "../lib/auth"; // change to "../lib/auth" if you don't use "@/"
import Link from "next/link";
import { Button } from "../components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "../components/ui/card";
import { Shield, Target, TrendingUp } from "lucide-react";

export default async function HomePage() {
  const session = getSessionFromCookies(); // reads HTTP-only JWT cookie
  const userEmail = session?.email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fall Simulation Training</h1>

        {!userEmail ? (
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href="/login">Log in</Link></Button>
            <Button asChild><Link href="/register">Register</Link></Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{userEmail}</span>
            <Button asChild><Link href="/dashboard">Dashboard</Link></Button>
            <form action="/api/auth/logout" method="post">
              <Button type="submit" variant="destructive">Log out</Button>
            </form>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-16">
        <section className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Fall Simulation Training
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Master emergency response scenarios with our advanced training platform.
            Track your progress and compete with others.
          </p>

          {!userEmail ? (
            <div className="flex gap-3 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-3"><Link href="/login">Start Training</Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/register">Create account</Link></Button>
            </div>
          ) : (
            <div className="flex gap-3 justify-center">
              <Button asChild size="lg"><Link href="/dashboard">Continue to Dashboard</Link></Button>
              <form action="/api/auth/logout" method="post">
                <Button type="submit" size="lg" variant="outline">Log out</Button>
              </form>
            </div>
          )}
        </section>

        <section className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Safety First</CardTitle>
              <CardDescription>Learn proper response techniques for medical emergencies</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Practice low-sugar shock, stroke, and slip scenarios in a safe environment.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Target className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Skill Tracking</CardTitle>
              <CardDescription>Monitor your performance across scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Get detailed scores and feedback to improve your emergency response skills.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Leaderboards</CardTitle>
              <CardDescription>Compete and see how you rank globally</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Challenge yourself to reach the top and earn recognition.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
