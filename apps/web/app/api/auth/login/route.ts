import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, signSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let password: string;
  try {
    ({ password } = (await req.json()) as { password: string });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Server not configured" }, { status: 500 });
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    await new Promise((r) => setTimeout(r, 300));
    return Response.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await signSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
