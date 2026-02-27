import { NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/adminAuth";

// POST /api/admin/logout — encerra sessão admin
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getAdminSessionCookieName(),
    value: "",
    maxAge: 0,
    path: "/",
  });
  return response;
}
