import { NextResponse } from "next/server";
import {
  hashPassword,
  signSession,
  setAuthCookie,
  usersCollection,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const users = await usersCollection();
    const normalized = String(email).toLowerCase().trim();

    const exists = await users.findOne({ email: normalized });
    if (exists) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    const hashed = await hashPassword(password);
    await users.insertOne({
      email: normalized,
      password: hashed,
      createdAt: new Date(),
    });

    const token = await signSession({ sub: normalized, email: normalized });
    setAuthCookie(token);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const code = e?.code === 11000 ? 409 : 500;
    return NextResponse.json({ error: "Registration failed" }, { status: code });
  }
}