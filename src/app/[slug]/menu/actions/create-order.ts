"use server";

import { ConsumptionMethod, OrderPaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/prisma";

import { removeCpfPunctuation } from "../helpers/cpf";

interface CreateOrderInput {
  customerName: string;
  customerCpf: string;
  products: Array<{
    id: string;
    quantity: number;
  }>;
  consumptionMethod: ConsumptionMethod;
  paymentMethod: OrderPaymentMethod;
  slug: string;
}

export const createOrder = async (input: CreateOrderInput) => {
  const name = input.customerName.trim();
  const cpf = removeCpfPunctuation(input.customerCpf);

  if (!name || !cpf || !input.products.length) {
    throw new Error("Dados do pedido inválidos.");
  }

  const restaurant = await db.restaurant.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });

  if (!restaurant) {
    throw new Error("Restaurante não encontrado.");
  }

  const quantities = new Map<string, number>();

  for (const item of input.products) {
    if (!item.id || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new Error("Produto ou quantidade inválida.");
    }

    quantities.set(item.id, (quantities.get(item.id) ?? 0) + item.quantity);
  }

  const ids = [...quantities.keys()];

  const products = await db.product.findMany({
    where: {
      id: { in: ids },
      restaurantId: restaurant.id,
    },
    select: {
      id: true,
      name: true,
      price: true,
    },
  });

  if (products.length !== ids.length) {
    throw new Error("Um ou mais produtos não pertencem a este restaurante.");
  }

  const orderProducts = products.map((product) => ({
    productId: product.id,
    quantity: quantities.get(product.id)!,
    price: product.price,
  }));

  const total = orderProducts.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  if (
    !Number.isFinite(total) ||
    total <= 0 ||
    !Number.isFinite(Math.round(total * 100) / 100)
  ) {
    throw new Error("Valor total do pedido inválido.");
  }

  const order = await db.order.create({
    data: {
      status: "PENDING",
      customerName: name,
      customerCpf: cpf,
      paymentMethod: input.paymentMethod,
      total,
      consumptionMethod: input.consumptionMethod,
      restaurantId: restaurant.id,
      orderProducts: {
        create: orderProducts,
      },
    },
  });

  revalidatePath(`/${input.slug}/orders`);

  return order;
};
