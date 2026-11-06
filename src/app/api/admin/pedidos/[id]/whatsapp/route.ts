import { NextResponse } from "next/server";

import { authorizeAdmin, validateRequestOrigin } from "@/lib/admin-api";
import { db } from "@/lib/prisma";
import { sendOrderNotification } from "@/lib/whatsapp";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
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

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    }

    const restaurant = await db.restaurant.findFirst({
      select: { id: true, whatsappPhone: true },
    });

    if (!restaurant?.whatsappPhone) {
      return NextResponse.json(
        { error: "WhatsApp do restaurante não configurado." },
        { status: 400 },
      );
    }

    const order = await db.order.findFirst({
      where: {
        id: orderId,
        restaurantId: restaurant.id,
      },
      include: {
        orderProducts: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    if (order.status !== "PAYMENT_CONFIRMED") {
      return NextResponse.json(
        { error: "O pagamento ainda não foi confirmado." },
        { status: 409 },
      );
    }

    if (order.whatsappNotifiedAt) {
      return NextResponse.json(
        { error: "A notificação já foi enviada." },
        { status: 409 },
      );
    }

    await sendOrderNotification({
      order,
      restaurantPhone: restaurant.whatsappPhone,
    });

    await db.order.update({
      where: { id: order.id },
      data: {
        whatsappNotifiedAt: new Date(),
        whatsappNotificationError: null,
      },
    });

    return NextResponse.json({
      message: "Pedido enviado pelo WhatsApp com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao reenviar WhatsApp:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar a notificação.",
      },
      { status: 500 },
    );
  }
}
