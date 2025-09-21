Fall Simulation Dashboard

A Next.js (App Router) + MongoDB app for collecting and visualizing gameplay sessions posted from a Unity game. Features:

Local email/password auth (bcrypt, JWT cookie for the web app)

Secure(able) Unity → Server ingest API (stores sessions in MongoDB)

User stats & leaderboard endpoints

Example landing page without Auth0

Curl & Unity integration examples

1) Prerequisites

Node.js 18+ (recommended: LTS)

npm or pnpm

MongoDB (Local or Atlas)

Unity project (to POST results to the ingest API)

2) Environment Variables

Create a .env.local in the project root:

# Database
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority

# JWT for the web app’s session (used by getSessionFromCookies). Any strong random secret will do.
JWT_SECRET=super_long_random_string

# Ingest write key (OPTIONAL). If set, requests must include x-ingest-key header.
# Leave blank to accept requests without a key (dev only).
INGEST_WRITE_KEY=


Tip: Keep secrets out of source control.

3) Install & Run
npm i
npm run dev
# visit http://localhost:3000


If you changed TypeScript config or path aliases, you may need to clear the Next build cache:

rm -rf .next
npm run dev

4) Project Structure (key files)
src/
  app/
    page.tsx                          # Landing page (no Auth0)
    api/
      auth/
        register/route.ts             # (Option B) Register user (email+password -> bcrypt hash)
      ingest/
        session/route.ts              # Ingest endpoint (Unity → Mongo, with email/password auth)
      game-sessions/route.ts          # GET user's sessions
      user-stats/route.ts             # GET user's aggregated stats
      leaderboard/route.ts            # GET leaderboard (best per user)
  lib/
    db.ts                             # Mongo client helper
    auth.ts                           # getSessionFromCookies (JWT cookie reader)
  types/
    game.ts                           # Type definitions for sessions/stats/leaderboard


If you don’t use @/ alias: change imports to relative paths (e.g. ../lib/db).

5) Database Schema (suggested)
users collection
{
  "_id": ObjectId,
  "email": "player@example.com",
  "passwordHash": "$2a$12$...",
  "createdAt": "2025-01-01T00:00:00.000Z"
}

gameSessions collection
{
  "_id": ObjectId,
  "userId": "64f... (stringified _id from users)",
  "username": "player@example.com",
  "sessionId": "session_unity_123",
  "scores": {
    "lowSugarShockFall": 90,
    "strokeFall": 85,
    "waterSlipFall": 80
  },
  "totalScore": 255,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "feedback": null,
  "source": "unity",
  "saved": 2,
  "lost": 1,
  "endedReason": "All Cases Resolved",
  "timeRemainingSeconds": 45,
  "gameDurationSeconds": 300,
  "timeSpentSeconds": 255
}


Indexes (recommended):

users.email unique

gameSessions.sessionId unique

gameSessions.userId + createdAt compound

gameSessions.totalScore for leaderboard

6) Auth (web app)

We use a small helper that reads a JWT from an HTTP-only cookie:

// src/lib/auth.ts
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET!;
type Session = { uid: string; email: string };

export function getSessionFromCookies(): Session | null {
  const token = cookies().get("session")?.value;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET) as Session; }
  catch { return null; }
}


You can implement /api/auth/login and /api/auth/logout to set/clear this cookie. (Not required for ingest, but useful for the dashboard UI.)

7) Ingest API (Unity → Server)

Endpoint: POST /api/ingest/session

Auth: by email + password (bcrypt) in the request body.
(Optional) If INGEST_WRITE_KEY is set, also require header x-ingest-key.

Accepts two shapes (you can send one or both using the same sessionId):

A) Gameplay payload
{
  "email": "player@example.com",
  "password": "secret123",
  "sessionId": "session_001",
  "scores": { "lowSugarShockFall": 90, "strokeFall": 85, "waterSlipFall": 80 },
  "totalScore": 255,
  "createdAt": "2025-09-21T12:00:00Z",
  "timeRemainingSeconds": 112,
  "gameDurationSeconds": 300,
  "feedback": "optional"
}

B) Game-over payload
{
  "email": "player@example.com",
  "password": "secret123",
  "sessionId": "session_001",
  "saved": 2,
  "lost": 1,
  "timeRemainingSeconds": 45,
  "gameDurationSeconds": 300,
  "endedReason": "All Cases Resolved",
  "createdAt": "2025-09-21T12:10:00Z"
}


Behavior:

Looks up the user by email, validates password (bcrypt).

Upserts gameSessions by sessionId (idempotent).

If you send gameplay first and game-over later with the same sessionId, they merge.

cURL test:

curl -X POST http://localhost:3000/api/ingest/session \
  -H "Content-Type: application/json" \
  -d '{
    "email":"player@example.com",
    "password":"secret123",
    "sessionId":"session_unity_test_1",
    "saved":2,
    "lost":1,
    "timeRemainingSeconds":42,
    "gameDurationSeconds":300,
    "endedReason":"All Cases Resolved"
  }'


If you prefer auto-provision (create user if not found), we included that variant in chat. Use it for rapid prototyping; otherwise keep registration separate.

8) Register API (Option B)

If you want to register users first:

Endpoint: POST /api/auth/register
Body:

{ "email": "player@example.com", "password": "secret123" }


Creates the user with passwordHash (bcrypt).

Returns 409 if the email already exists.

Then ingest can authenticate the same credentials.

9) Read APIs (dashboard)

GET /api/game-sessions?userId=<uid>
Returns the requesting user’s sessions (scoped to the cookie session or to userId if you add admin).

GET /api/user-stats?userId=<uid>
Aggregates best score, average score, total sessions.

GET /api/leaderboard
Returns one row per user (best total score), ranked.

10) Unity Integration (quick reference)

Minimal sender (from our ServerIngest pattern):

public IEnumerator SendSession(string url, string email, string password, string sessionId, int secsLeft) {
  var payload = new {
    email, password,
    sessionId,
    timeRemainingSeconds = secsLeft,
    gameDurationSeconds  = 300,
    endedReason = "All Cases Resolved"
  };
  var json = JsonUtility.ToJson(payload);
  using (var req = new UnityWebRequest(url, "POST")) {
    byte[] body = System.Text.Encoding.UTF8.GetBytes(json);
    req.uploadHandler = new UploadHandlerRaw(body);
    req.downloadHandler = new DownloadHandlerBuffer();
    req.SetRequestHeader("Content-Type", "application/json");
    yield return req.SendWebRequest();
    Debug.Log($"Ingest: {req.responseCode} {req.downloadHandler.text}");
  }
}

11) Security Notes

Dev only: you can run ingest without an API key. For staging/prod, add:

INGEST_WRITE_KEY + x-ingest-key header

Rate limiting & input size limits

Optional HMAC signing of payloads

Don’t store plaintext passwords. We use bcrypt.

Use HTTPS in production.

12) Troubleshooting

Module not found / path alias @/
Add tsconfig.json:

{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } } }


Move code under src/ or switch to relative imports.

JWT types/imports
npm i jsonwebtoken @types/jsonwebtoken -D
In tsconfig.json:

{ "compilerOptions": { "esModuleInterop": true, "skipLibCheck": true } }


Mongo connection errors
Verify MONGODB_URI and network access (Atlas IP allowlist).

401 from ingest
Ensure the user exists (or enable auto-provision), and the password matches the stored bcrypt hash.

Time not stored
Confirm you’re sending timeRemainingSeconds and gameDurationSeconds and that the ingest route maps them (it does by default here).


13) Game

The most game assets are more than 25MB and larges files are not able to uploaded as there is large file limit. I separately attach low data files such as game c# scripts in the game folder.