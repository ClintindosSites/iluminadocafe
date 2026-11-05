import { NextResponse } from "next/server";

import { createMercadoPagoCheckout } from "@/lib/mercado-pago";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { orderId, slug } = body;

    if (!orderId || !slug) {
      return NextResponse.json(
        { error: "Dados do pedido inválidos." },
        { status: 400 },
      );
    }

    const result = await createMercadoPagoCheckout({
      orderId: Number(orderId),
      slug: String(slug),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao criar checkout:", error);

    return NextResponse.json(
      { error: "Não foi possível gerar o checkout." },
      { status: 500 },
    );
  }
}
