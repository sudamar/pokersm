import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getAdminSessionCookieName,
  getAdminSessionMaxAge,
  isAdminCredentialsConfigured,
  isAdminCredentialsValid,
} from "@/lib/adminAuth";

// POST /api/admin/login — autentica admin com usuário/senha
export async function POST(request: NextRequest) {
  const { username, password } = (await request.json()) as {
    username?: string;
    password?: string;
  };

  if (!isAdminCredentialsConfigured()) {
    return NextResponse.json(
      { error: "Credenciais admin não configuradas no servidor" },
      { status: 500 }
    );
  }

  if (!username || !password || !isAdminCredentialsValid(username, password)) {
    return NextResponse.json(
      { error: "Usuário ou senha inválidos" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getAdminSessionCookieName(),
    value: createAdminSessionToken(username),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: getAdminSessionMaxAge(),
    path: "/",
  });

  return response;
}
