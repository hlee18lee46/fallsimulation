// app/api/game-results/route.ts
import { NextResponse, NextRequest } from "next/server";
import clientPromise from "../../../lib/mongodb";

export const runtime = "nodejs";

// Optional: require a bearer token to avoid sending real passwords around
const EXPECTED_BEARER = process.env.GAME_RESULTS_TOKEN ?? "";

function jsonBad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

// If you’re building a WebGL build that runs from a different origin, keep CORS handy.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}

export async function POST(req: NextRequest) {
  // CORS
  const cors = new Headers();
  cors.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  cors.set("Vary", "Origin");

  // (Optional) Token check. If you don’t want this, delete this block.
  if (EXPECTED_BEARER) {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== EXPECTED_BEARER) {
      return new NextResponse(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: cors,
      });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: cors,
    });
  }

  // Basic validation (keep it simple)
  const { email, password, saved, lost } = (body ?? {}) as {
    email?: string;
    password?: string;
    saved?: number;
    lost?: number;
  };

  if (!email || typeof email !== "string") return new NextResponse(JSON.stringify({ ok: false, error: "email required" }), { status: 400, headers: cors });
  if (typeof password !== "string") return new NextResponse(JSON.stringify({ ok: false, error: "password required" }), { status: 400, headers: cors });
  if (typeof saved !== "number" || typeof lost !== "number") return new NextResponse(JSON.stringify({ ok: false, error: "saved/lost must be numbers" }), { status: 400, headers: cors });

  // NOTE: In production, do NOT send/store raw passwords from clients.
  // Prefer sending a token or authenticated user ID.
  // This is just matching your current Unity payload.

  try {
    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB || "app";
    const db = client.db(dbName);
    const collection = db.collection("game_sessions");

    const now = new Date();
    const doc = {
      email,
      password, // <-- strongly discouraged long-term
      scores: { saved, lost, total: saved + lost },
      reason: "GameOver", // you can extend if you send reason later
      createdAt: now,
      userAgent: req.headers.get("user-agent") || null,
      ip: req.headers.get("x-forwarded-for") || null,
    };

    const { insertedId } = await collection.insertOne(doc);

    return new NextResponse(JSON.stringify({ ok: true, id: String(insertedId) }), {
      status: 200,
      headers: cors,
    });
  } catch (err) {
    console.error(err);
    return new NextResponse(JSON.stringify({ ok: false, error: "DB insert failed" }), {
      status: 500,
      headers: cors,
    });
  }
}
