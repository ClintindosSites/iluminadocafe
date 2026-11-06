import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { db } from "@/lib/prisma";
import { sendOrderNotification } from "@/lib/whatsapp";

export const runtime = "nodejs";

interface MercadoPagoPayment {
  id: number;
  status: string;
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
  preference_id: string | null;
}

function validateSignature(
  signature: string | null,
  requestId: string | null,
  dataId: string | null,
) {
  const secret = process.env.MP_WEBHOOK_SECRET;

  if (!secret || !signature || !requestId || !dataId) {
    return false;
  }

  const parts = Object.fromEntries(
    signature.split(",").map((part) => {
      const [key, ...values] = part.trim().split("=");
      return [key, values.join("=")];
    }),
  );

  const timestamp = parts.ts;
  const receivedHash = parts.v1;

  if (!timestamp || !receivedHash) return false;

  const timestampNumber = Number(timestamp);

  if (
    !Number.isSafeInteger(timestampNumber) ||
    Math.abs(Date.now() - timestampNumber * 1000) > 5 * 60 * 1000
  ) {
    return false;
  }

  const normalizedId = /^[a-zA-Z0-9]+$/.test(dataId)
    ? dataId.toLowerCase()
    : dataId;

  const manifest = `id:${normalizedId};request-id:${requestId};ts:${timestamp};`;

  const expectedHash = createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const received = Buffer.from(receivedHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return (
    receivedHash.length === 64 &&
    received.length === expected.length &&
    timingSafeEqual(received, expected)
  );
}

async function getPayment(paymentId: string) {
  const accessToken = process.env.MP_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN não configurado.");
  }

  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Falha ao consultar pagamento no Mercado Pago: ${response.status}`,
    );
  }

  return (await response.json()) as MercadoPagoPayment;
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);

    const dataId =
      url.searchParams.get("data.id") ?? url.searchParams.get("id");

    const signature = request.headers.get("x-signature");
    const requestId = request.headers.get("x-request-id");

    if (!validateSignature(signature, requestId, dataId)) {
      return NextResponse.json(
        { error: "Assinatura inválida." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);

    if (
      body?.type !== "payment" &&
      url.searchParams.get("type") !== "payment"
    ) {
      return NextResponse.json({ received: true });
    }

    if (!dataId) {
      return NextResponse.json(
        { error: "Identificador do pagamento ausente." },
        { status: 400 },
      );
    }

    // A notificação é apenas um aviso.
    // O estado real vem da API do Mercado Pago.
    const payment = await getPayment(dataId);

    if (!payment.external_reference) {
      return NextResponse.json({ received: true });
    }

    const orderId = Number(payment.external_reference);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ received: true });
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: true,
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
      return NextResponse.json({ received: true });
    }

    // Confere o valor e a moeda antes de aceitar o pagamento.
    if (
      payment.currency_id !== "BRL" ||
      Math.round(payment.transaction_amount * 100) !==
        Math.round(order.total * 100)
    ) {
      console.error(
        `Pagamento ${payment.id}: valor ou moeda divergente do pedido ${order.id}.`,
      );

      return NextResponse.json(
        { error: "Dados do pagamento divergentes." },
        { status: 422 },
      );
    }

    // Confere também a preferência vinculada ao pedido.
    if (
      order.mercadoPagoPreferenceId &&
      payment.preference_id !== order.mercadoPagoPreferenceId
    ) {
      return NextResponse.json(
        { error: "Preferência de pagamento divergente." },
        { status: 422 },
      );
    }

    if (payment.status === "approved") {
      // A atualização condicional evita confirmar duas vezes.
      const updated = await db.order.updateMany({
        where: {
          id: order.id,
          status: "PENDING",
        },
        data: {
          status: "PAYMENT_CONFIRMED",
        },
      });

      if (updated.count === 1) {
        if (!order.restaurant.whatsappPhone) {
          await db.order.update({
            where: { id: order.id },
            data: {
              whatsappNotificationError:
                "WhatsApp do restaurante não configurado.",
            },
          });

          return NextResponse.json({
            received: true,
            paymentConfirmed: true,
            whatsappSent: false,
          });
        }

        try {
          await sendOrderNotification({
            order,
            restaurantPhone: order.restaurant.whatsappPhone,
          });

          await db.order.update({
            where: { id: order.id },
            data: {
              whatsappNotifiedAt: new Date(),
              whatsappNotificationError: null,
            },
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Erro desconhecido no WhatsApp.";

          await db.order.update({
            where: { id: order.id },
            data: {
              whatsappNotificationError: message.slice(0, 1000),
            },
          });

          console.error(`Falha ao notificar pedido ${order.id}:`, error);
        }
      }
    } else if (
      ["rejected", "cancelled", "refunded", "charged_back"].includes(
        payment.status,
      )
    ) {
      await db.order.updateMany({
        where: {
          id: order.id,
          status: "PENDING",
        },
        data: {
          status: "PAYMENT_FAILED",
        },
      });
    }

    return NextResponse.json({
      received: true,
      paymentStatus: payment.status,
    });
  } catch (error) {
    console.error("Erro no webhook Mercado Pago:", error);

    return NextResponse.json(
      { error: "Erro ao processar notificação." },
      { status: 500 },
    );
  }
}
