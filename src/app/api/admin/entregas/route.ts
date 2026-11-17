import { NextResponse } from "next/server";

import { authorizeAdmin, validateRequestOrigin } from "@/lib/admin-api";
import { db } from "@/lib/prisma";

export const runtime = "nodejs";

function validateRanges(
  ranges: Array<{
    minDistanceKm: number;
    maxDistanceKm: number;
    fee: number;
  }>,
  maxDistanceKm: number,
) {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    throw new Error("Cadastre pelo menos uma faixa de entrega.");
  }

  const sorted = [...ranges].sort((a, b) => a.minDistanceKm - b.minDistanceKm);

  if (sorted.length > 30) {
    throw new Error("Máximo de 30 faixas permitido.");
  }

  if (sorted[0].minDistanceKm !== 0) {
    throw new Error("A primeira faixa deve começar em 0 km.");
  }

  for (let i = 0; i < sorted.length; i++) {
    const range = sorted[i];

    if (
      !Number.isFinite(range.minDistanceKm) ||
      !Number.isFinite(range.maxDistanceKm) ||
      !Number.isFinite(range.fee) ||
      range.minDistanceKm < 0 ||
      range.maxDistanceKm <= range.minDistanceKm ||
      range.fee < 0 ||
      range.fee > 10000
    ) {
      throw new Error("Uma das faixas possui valores inválidos.");
    }

    if (i > 0) {
      const previous = sorted[i - 1];

      if (Math.abs(previous.maxDistanceKm - range.minDistanceKm) > 0.001) {
        throw new Error("As faixas não podem ter intervalos ou sobreposições.");
      }
    }
  }

  if (
    Math.abs(sorted[sorted.length - 1].maxDistanceKm - maxDistanceKm) > 0.001
  ) {
    throw new Error(
      "A última faixa deve terminar no limite máximo de entrega.",
    );
  }

  return sorted;
}

export async function GET() {
  const unauthorized = await authorizeAdmin();

  if (unauthorized) return unauthorized;

  try {
    const restaurant = await db.restaurant.findFirst({
      include: {
        deliveryFeeRanges: {
          orderBy: {
            minDistanceKm: "asc",
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      settings: {
        deliveryEnabled: restaurant.deliveryEnabled,
        deliveryAddress: restaurant.deliveryAddress,
        deliveryMaxDistanceKm: restaurant.deliveryMaxDistanceKm,
        ranges: restaurant.deliveryFeeRanges,
      },
    });
  } catch (error) {
    console.error("Erro ao carregar entregas:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar as entregas." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const unauthorized = await authorizeAdmin();

  if (unauthorized) return unauthorized;

  if (!validateRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();

    const deliveryEnabled = body.deliveryEnabled;
    const deliveryAddress = String(body.deliveryAddress ?? "").trim();
    const maxDistanceKm = Number(body.deliveryMaxDistanceKm);

    if (typeof deliveryEnabled !== "boolean") {
      return NextResponse.json(
        { error: "Estado do delivery inválido." },
        { status: 400 },
      );
    }

    if (!deliveryAddress || deliveryAddress.length > 300) {
      return NextResponse.json(
        { error: "Informe um endereço de origem válido." },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(maxDistanceKm) ||
      maxDistanceKm <= 0 ||
      maxDistanceKm > 100
    ) {
      return NextResponse.json(
        { error: "Limite de entrega inválido." },
        { status: 400 },
      );
    }

    const ranges = validateRanges(body.ranges, maxDistanceKm);

    const restaurant = await db.restaurant.findFirst();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante não encontrado." },
        { status: 404 },
      );
    }

    const updated = await db.$transaction(async (tx) => {
      await tx.restaurant.update({
        where: { id: restaurant.id },
        data: {
          deliveryEnabled,
          deliveryAddress,
          deliveryMaxDistanceKm: maxDistanceKm,
        },
      });

      await tx.deliveryFeeRange.deleteMany({
        where: {
          restaurantId: restaurant.id,
        },
      });

      await tx.deliveryFeeRange.createMany({
        data: ranges.map((range) => ({
          restaurantId: restaurant.id,
          minDistanceKm: range.minDistanceKm,
          maxDistanceKm: range.maxDistanceKm,
          fee: Math.round(range.fee * 100) / 100,
        })),
      });

      return tx.restaurant.findUnique({
        where: { id: restaurant.id },
        include: {
          deliveryFeeRanges: {
            orderBy: { minDistanceKm: "asc" },
          },
        },
      });
    });

    return NextResponse.json({
      message: "Configurações de entrega salvas!",
      settings: updated,
    });
  } catch (error) {
    console.error("Erro ao salvar entregas:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar as configurações.",
      },
      { status: 400 },
    );
  }
}
