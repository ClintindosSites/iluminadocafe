import { NextResponse } from "next/server";

import {
  createAdminToken,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = body?.password;

    if (typeof password !== "string" || password.length > 200) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 400 },
      );
    }

    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
    }

    const token = createAdminToken();
    await setAdminSession(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no login administrativo:", error);

    return NextResponse.json(
      { error: "Não foi possível realizar o login." },
      { status: 500 },
    );
  }
}
