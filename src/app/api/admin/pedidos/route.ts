import { NextResponse } from "next/server";

import { authorizeAdmin } from "@/lib/admin-api";
import { db } from "@/lib/prisma";

export async function GET() {
  const unauthorized = await authorizeAdmin();
  if (unauthorized) return unauthorized;

  try {
    const restaurant = await db.restaurant.findFirst({
      select: { id: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante não encontrado." },
        { status: 404 },
      );
    }

    const orders = await db.order.findMany({
      where: {
        restaurantId: restaurant.id,
      },
      include: {
        orderProducts: {
          include: {
            product: {
              select: {
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Erro ao listar pedidos:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os pedidos." },
      { status: 500 },
    );
  }
}
