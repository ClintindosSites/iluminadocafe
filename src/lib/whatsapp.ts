interface OrderNotificationInput {
  order: {
    id: number;
    total: number;
    customerName: string;
    consumptionMethod: string;
    paymentMethod: string | null;
    orderProducts: Array<{
      quantity: number;
      product: {
        name: string;
      };
    }>;
  };
  restaurantPhone: string;
}

export async function sendOrderNotification({
  order,
  restaurantPhone,
}: OrderNotificationInput) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = "novo_pedido_restaurante";

  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp Cloud API não configurada.");
  }

  const products = order.orderProducts
    .map((item) => `${item.quantity}x ${item.product.name}`)
    .join(", ");

  const consumptionMethods: Record<string, string> = {
    TAKEAWAY: "Retirada",
    DINE_IN: "Consumo no local",
    SCHEDULE_ORDER: "Pedido agendado",
  };

  const paymentMethods: Record<string, string> = {
    PIX: "PIX",
    CARD: "Cartão",
    CASH_ON_DELIVERY: "Pagamento na entrega",
  };

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: restaurantPhone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "pt_BR",
          },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: String(order.id) },
                { type: "text", text: order.customerName },
                {
                  type: "text",
                  text: order.total.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }),
                },
                { type: "text", text: products },
                {
                  type: "text",
                  text:
                    consumptionMethods[order.consumptionMethod] ??
                    order.consumptionMethod,
                },
                {
                  type: "text",
                  text:
                    paymentMethods[order.paymentMethod ?? ""] ??
                    "Não informado",
                },
              ],
            },
          ],
        },
      }),
      cache: "no-store",
    },
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("Erro da WhatsApp Cloud API:", result);

    throw new Error(
      result.error?.message ??
        "Não foi possível enviar a mensagem pelo WhatsApp.",
    );
  }

  return result;
}
