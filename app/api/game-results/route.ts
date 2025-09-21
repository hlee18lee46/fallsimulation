// app/api/game-results/route.ts
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/mongodb"; // ← if you use clientPromise instead, see comment below

export const runtime = "nodejs";

const EXPECTED_BEARER = process.env.GAME_RESULTS_TOKEN ?? "";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

function corsHeaders() {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  h.set("Vary", "Origin");
  return h;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}

type Payload = {
  email?: string;
  password?: string;              // ⚠️ ideally don’t send/store this
  saved?: number;
  lost?: number;
  timeRemainingSeconds?: number;  // Unity: int
  gameDurationSeconds?: number;   // Unity JsonUtility: use -1 if unknown
  endedReason?: string;           // "Time Up" | "All Cases Resolved" | ...
  sessionId?: string;             // GUID from Unity
  createdAt?: string;             // ISO8601 string from Unity
  scenario?: string;              // optional label
  metadata?: Record<string, any>; // optional extras
};

export async function POST(req: NextRequest) {
  const cors = new Headers();
  cors.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  cors.set("Vary", "Origin");

  // Bearer (optional)
  if (EXPECTED_BEARER) {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== EXPECTED_BEARER) {
      console.log("[/api/game-results] 401 Unauthorized (bad/missing bearer)");
      return new NextResponse(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: cors });
    }
  }

  // Log raw first
  const receivedAt = new Date().toISOString();
  const raw = await req.clone().text();
  console.log("[/api/game-results] HIT", { receivedAt, raw, headers: Object.fromEntries(req.headers) });

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(JSON.stringify({ ok: false, error: "Invalid JSON" }), { status: 400, headers: cors });
  }

  const {
    email, password, saved, lost,
    timeRemainingSeconds, gameDurationSeconds,
    endedReason, sessionId, createdAt, scenario, metadata
  } = body;

  if (!email || typeof email !== "string")
    return new NextResponse(JSON.stringify({ ok: false, error: "email required" }), { status: 400, headers: cors });
  if (typeof password !== "string")
    return new NextResponse(JSON.stringify({ ok: false, error: "password required" }), { status: 400, headers: cors });
  if (typeof saved !== "number" || typeof lost !== "number")
    return new NextResponse(JSON.stringify({ ok: false, error: "saved/lost must be numbers" }), { status: 400, headers: cors });

  // Normalize optional numbers from Unity (use -1 in Unity if unknown; convert to null)
  const timeLeft = (typeof timeRemainingSeconds === "number") ? timeRemainingSeconds : null;
  const gameDur = (typeof gameDurationSeconds === "number" && gameDurationSeconds >= 0) ? gameDurationSeconds : null;

  let created = new Date();
  if (createdAt && !Number.isNaN(Date.parse(createdAt))) created = new Date(createdAt);

  try {
    // Use your chosen DB helper
    // const client = await clientPromise;
    // const dbName = process.env.MONGODB_DB || "app";
    // const database = client.db(dbName);

    const database = await db(); // if you’re using the singleton helper
    const collection = database.collection("game_sessions");

    const doc = {
      email,
      password, // ⚠️ strongly discourage; switch to cookie or bearer user ID soon
      scores: { saved, lost, total: saved + lost },
      timeRemainingSeconds: timeLeft,
      gameDurationSeconds: gameDur,
      endedReason: endedReason ?? null,
      sessionId: sessionId ?? null,
      scenario: scenario ?? null,
      metadata: metadata ?? {},
      createdAt: created,
      userAgent: req.headers.get("user-agent") || null,
      ip: req.headers.get("x-forwarded-for") || null,
    };

    const { insertedId } = await collection.insertOne(doc);
    console.log("[/api/game-results] INSERTED", insertedId);

    return new NextResponse(JSON.stringify({ ok: true, id: String(insertedId), stored: doc }), {
      status: 200, headers: cors,
    });
  } catch (err) {
    console.error("[/api/game-results] DB insert failed", err);
    return new NextResponse(JSON.stringify({ ok: false, error: "DB insert failed" }), {
      status: 500, headers: cors,
    });
  }
}