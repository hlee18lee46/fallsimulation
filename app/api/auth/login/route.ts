import { NextResponse } from "next/server";
import { verifyPassword, signSession, setAuthCookie, usersCollection } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const users = await usersCollection();
  const user = await users.findOne({ email: email.toLowerCase().trim() });
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await verifyPassword(password, user.password);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = await signSession({ sub: user._id.toString(), email: user.email });
  setAuthCookie(token);

  return NextResponse.json({ ok: true });
}