import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function authorizeAdmin() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 401 },
    );
  }

  return null;
}

export function validateRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
