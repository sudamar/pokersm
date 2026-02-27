import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "sudapok-admin-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ?? "sudapok-admin-local-secret";

function sign(payload: string) {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

function safeCompare(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function getAdminCredentialsFromEnv() {
  const username = process.env.usuario_admin?.trim();
  const password = process.env.senha_admin;

  if (!username || !password) return null;
  return { username, password };
}

export function isAdminCredentialsConfigured() {
  return getAdminCredentialsFromEnv() !== null;
}

export function isAdminCredentialsValid(username: string, password: string) {
  const credentials = getAdminCredentialsFromEnv();
  if (!credentials) return false;

  return (
    username.trim() === credentials.username &&
    safeCompare(password, credentials.password)
  );
}

export function createAdminSessionToken(username: string) {
  const issuedAt = Date.now();
  const payload = `${username.trim()}:${issuedAt}`;
  const signature = sign(payload);
  return `${payload}:${signature}`;
}

function isAdminSessionTokenValid(token: string) {
  const credentials = getAdminCredentialsFromEnv();
  if (!credentials) return false;

  const [username, issuedAtRaw, signature] = token.split(":");
  if (!username || !issuedAtRaw || !signature) return false;
  if (username !== credentials.username) return false;

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > SESSION_MAX_AGE_SECONDS * 1000) return false;

  const expectedSignature = sign(`${username}:${issuedAtRaw}`);
  return safeCompare(signature, expectedSignature);
}

export function isAdminRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  return isAdminSessionTokenValid(token);
}

export function getAdminSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getAdminSessionMaxAge() {
  return SESSION_MAX_AGE_SECONDS;
}
