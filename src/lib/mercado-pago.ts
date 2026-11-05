"use server";

import { MercadoPagoConfig, Preference } from "mercadopago";

import { db } from "@/lib/prisma";

interface CreateCheckoutInput {
  orderId: number;
  slug: string;
}

export async function createMercadoPagoCheckout({
  orderId,
  slug,
}: CreateCheckoutInput) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (!accessToken || !appUrl) {
    throw new Error("Mercado Pago não configurado.");
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      restaurant: { select: { slug: true } },
      orderProducts: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  if (!order || order.restaurant.slug !== slug) {
    throw new Error("Pedido não encontrado.");
  }

  if (
    order.status !== "PENDING" ||
    !["PIX", "CARD"].includes(order.paymentMethod ?? "")
  ) {
    throw new Error("Pedido não está disponível para pagamento online.");
  }

  if (!order.orderProducts.length) {
    throw new Error("O pedido não possui produtos.");
  }

  const totalInCents = Math.round(order.total * 100);
  const itemsTotalInCents = order.orderProducts.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
    0,
  );

  if (totalInCents !== itemsTotalInCents || totalInCents <= 0) {
    throw new Error("O total do pedido não confere.");
  }

  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  const result = await preference.create({
    body: {
      items: order.orderProducts.map((item) => ({
        id: item.product.id,
        title: item.product.name,
        quantity: item.quantity,
        currency_id: "BRL",
        unit_price: item.price,
      })),

      external_reference: String(order.id),

      back_urls: {
        success: `${appUrl}/${slug}/orders`,
        pending: `${appUrl}/${slug}/orders`,
        failure: `${appUrl}/${slug}/orders`,
      },

      auto_return: "approved",
      notification_url: `${appUrl}/api/webhooks/mercado-pago`,
    },
  });

  if (!result.id || !result.init_point) {
    throw new Error("Não foi possível gerar o checkout.");
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      mercadoPagoPreferenceId: result.id,
    },
  });

  return {
    checkoutUrl: result.init_point,
    preferenceId: result.id,
  };
}
