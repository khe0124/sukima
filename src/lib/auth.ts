import { createHmac, timingSafeEqual } from "node:crypto";

import { NextRequest } from "next/server";

import { getRequiredEnv } from "./env";

export const ADMIN_SESSION_COOKIE = "sukima_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function verifyAdminCredentials({
  email,
  password,
  adminEmail = getRequiredEnv("ADMIN_EMAIL"),
  adminPassword = getRequiredEnv("ADMIN_PASSWORD")
}: {
  email: string;
  password: string;
  adminEmail?: string;
  adminPassword?: string;
}) {
  return safeEqual(email, adminEmail) && safeEqual(password, adminPassword);
}

export async function createAdminSessionToken({
  email,
  secret = getRequiredEnv("AUTH_SECRET"),
  now = new Date()
}: {
  email: string;
  secret?: string;
  now?: Date;
}) {
  const payload = base64UrlEncode(
    JSON.stringify({
      email,
      exp: Math.floor(now.getTime() / 1000) + SESSION_TTL_SECONDS
    })
  );
  const signature = signPayload(payload, secret);

  return `${payload}.${signature}`;
}

export async function parseAdminSessionToken({
  token,
  secret = getRequiredEnv("AUTH_SECRET"),
  now = new Date()
}: {
  token: string | undefined;
  secret?: string;
  now?: Date;
}) {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = signPayload(payload, secret);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as {
      email?: unknown;
      exp?: unknown;
    };

    if (typeof parsed.email !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.exp <= Math.floor(now.getTime() / 1000)) return null;

    return { email: parsed.email };
  } catch {
    return null;
  }
}

export async function isAdminRequest(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await parseAdminSessionToken({ token });

  return session?.email === getRequiredEnv("ADMIN_EMAIL");
}

export async function requireAdmin(request: NextRequest) {
  const isAdmin = await isAdminRequest(request);

  if (!isAdmin) {
    throw new Error("Unauthorized.");
  }
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  };
}
