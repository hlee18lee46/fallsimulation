// lib/auth.ts
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./mongodb";

const COOKIE_NAME = process.env.COOKIE_NAME || "app_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET);
if (!process.env.JWT_SECRET) throw new Error("Missing JWT_SECRET");

type JwtPayload = { sub: string; email: string };

export async function hashPassword(plain: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hashed: string) {
  return bcrypt.compare(plain, hashed);
}

export async function signSession(payload: JwtPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function readSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<JwtPayload>(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearAuthCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Convenience bridge for your server components:
export async function getSessionFromCookies() {
  const session = await readSession();
  return session ? { email: session.email } : null;
}

// Mongo helpers
export async function usersCollection() {
  const database = await db();
  const col = database.collection("users");
  // Ensure unique index (runs harmlessly if already present)
  await col.createIndex({ email: 1 }, { unique: true });
  return col as any as {
    findOne(query: any): Promise<{ _id: any; email: string; password: string } | null>;
    insertOne(doc: any): Promise<any>;
  };
}