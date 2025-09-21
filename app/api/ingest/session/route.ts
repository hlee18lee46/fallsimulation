// app/api/ingest/session/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

// If you want a write key later, you can add it back as optional.
// const KEY = process.env.INGEST_WRITE_KEY ?? "";

type Scores = {
  lowSugarShockFall?: number;
  strokeFall?: number;
  waterSlipFall?: number;
};

type GameplayBody = {
  // optional user context from client; we will override with DB user if email/password is valid
  userId?: string;
  username?: string;

  // required for gameplay payload
  sessionId: string;
  scores: Scores;
  totalScore?: number;
  createdAt?: string;
  feedback?: string;

  // time fields (optional)
  timeRemainingSeconds?: number;
  gameDurationSeconds?: number;

  // credentials (required for auth)
  email?: string;
  password?: string;
};

type GameOverBody = {
  email?: string;          // REQUIRED for auth
  password?: string;       // REQUIRED for auth

  saved?: number;
  lost?: number;
  timeRemainingSeconds?: number;
  gameDurationSeconds?: number;
  endedReason?: string;
  sessionId?: string;
  createdAt?: string;

  // optional hints
  userId?: string;
  username?: string;
};

function toIntOrNull(v: any) {
  return Number.isFinite(v) ? Math.floor(v) : null;
}

export async function POST(req: Request) {
  // Optional: write-key check (uncomment to enforce)
  // const key = req.headers.get("x-ingest-key") || "";
  // if (KEY && key !== KEY) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  // Parse
  let body: GameplayBody | GameOverBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 1) REQUIRE credentials
  const email = (body as any).email?.toLowerCase();
  const password = (body as any).password;
  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password required" }, { status: 401 });
  }

  // 2) Verify user in Mongo
  const db = await getDb();
  const user = await db.collection("users").findOne<{ _id: any; email: string; passwordHash: string }>({ email });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // At this point, user is authenticated
  const canonicalUserId = String(user._id);
  const displayName = user.email; // or store `username` separately in your users collection

  // 3) Accept both payload shapes
  const hasScores = typeof (body as GameplayBody).scores === "object" && (body as GameplayBody).sessionId;
  const hasGameOver = typeof (body as GameOverBody).saved !== "undefined" || typeof (body as GameOverBody).lost !== "undefined";

  if (!hasScores && !hasGameOver) {
    return NextResponse.json({ error: "Missing required gameplay or game-over fields" }, { status: 400 });
  }

  // 4) Normalize core fields
  const nowIso = new Date().toISOString();
  const sessionId =
    (body as any).sessionId ??
    `session_${Math.random().toString(36).slice(2)}`;

  const createdAt = (body as any).createdAt || nowIso;

  // Scores (if present)
  const s: Scores = hasScores
    ? (body as GameplayBody).scores
    : { lowSugarShockFall: 0, strokeFall: 0, waterSlipFall: 0 };

  const lowSugar = toIntOrNull(s.lowSugarShockFall) ?? 0;
  const stroke   = toIntOrNull(s.strokeFall) ?? 0;
  const water    = toIntOrNull(s.waterSlipFall) ?? 0;

  const totalScore = hasScores
    ? (toIntOrNull((body as GameplayBody).totalScore) ?? lowSugar + stroke + water)
    : // for game-over only payloads, you can compute or leave 0
      0;

  // Game-over extras
  const saved  = toIntOrNull((body as GameOverBody).saved);
  const lost   = toIntOrNull((body as GameOverBody).lost);
  const endedReason = (body as GameOverBody).endedReason ?? null;

  const timeRemainingSeconds = toIntOrNull((body as any).timeRemainingSeconds);
  const gameDurationSeconds  = toIntOrNull((body as any).gameDurationSeconds);
  const timeSpentSeconds =
    timeRemainingSeconds != null && gameDurationSeconds != null
      ? Math.max(0, gameDurationSeconds - timeRemainingSeconds)
      : null;

  // 5) Build doc — DO NOT store plaintext password
  const doc = {
    userId: canonicalUserId,
    username: displayName,
    sessionId,
    scores: {
      lowSugarShockFall: lowSugar,
      strokeFall: stroke,
      waterSlipFall: water,
    },
    totalScore,
    createdAt,
    feedback: (body as any).feedback ?? null,
    source: "unity",

    // Game-over specific fields
    saved,
    lost,
    endedReason,
    timeRemainingSeconds,
    gameDurationSeconds,
    timeSpentSeconds,

    // never include email/password in DB doc; they were only used for auth
  };

  // 6) Upsert by sessionId
  await db.collection("gameSessions").updateOne(
    { sessionId },
    {
      $setOnInsert: {
        ...doc,
      },
      $set: {
        // in case this call is a second phase update (e.g., add timeRemaining later)
        scores: doc.scores,
        totalScore: doc.totalScore,
        feedback: doc.feedback,
        saved,
        lost,
        endedReason,
        timeRemainingSeconds,
        gameDurationSeconds,
        timeSpentSeconds,
        username: displayName,
        userId: canonicalUserId,
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, sessionId });
}
