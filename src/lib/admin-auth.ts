import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "iluminado_admin_session";
const SESSION_DURATION = 60 * 60 * 8;

function sign(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET não configurado corretamente.");
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeCompare(a: string, b: string) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);

  return first.length === second.length && timingSafeEqual(first, second);
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    throw new Error("ADMIN_PASSWORD não configurado.");
  }

  return safeCompare(password, expected);
}

export function createAdminToken() {
  const payload = Buffer.from(
    JSON.stringify({
      role: "admin",
      expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION,
    }),
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token: string) {
  try {
    const [payload, signature] = token.split(".");

    if (!payload || !signature) return false;

    if (!safeCompare(signature, sign(payload))) return false;

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

    return (
      data.role === "admin" &&
      typeof data.expiresAt === "number" &&
      data.expiresAt > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  return token ? verifyAdminToken(token) : false;
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin-login");
  }
}

export async function setAdminSession(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAME);
}
