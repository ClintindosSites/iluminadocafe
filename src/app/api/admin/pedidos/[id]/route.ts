import { NextResponse } from "next/server";

import { authorizeAdmin, validateRequestOrigin } from "@/lib/admin-api";
import { db } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await authorizeAdmin();
  if (unauthorized) return unauthorized;

  if (!validateRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;
    const orderId = Number(id);
    const body = await request.json();

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    }

    if (!["IN_PREPARATION", "FINISHED"].includes(body.status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    const restaurant = await db.restaurant.findFirst({
      select: { id: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante não encontrado." },
        { status: 404 },
      );
    }

    const allowedPreviousStatus =
      body.status === "IN_PREPARATION" ? "PAYMENT_CONFIRMED" : "IN_PREPARATION";

    const updated = await db.order.updateMany({
      where: {
        id: orderId,
        restaurantId: restaurant.id,
        status: allowedPreviousStatus,
      },
      data: {
        status: body.status,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        {
          error:
            "Pedido não encontrado ou não permite essa alteração de status.",
        },
        { status: 409 },
      );
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    return NextResponse.json({
      message: "Pedido atualizado com sucesso!",
      order,
    });
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);

    return NextResponse.json(
      { error: "Não foi possível atualizar o pedido." },
      { status: 500 },
    );
  }
}
