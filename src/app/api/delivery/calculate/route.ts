import { NextResponse } from "next/server";

import { calculateDrivingDistance } from "@/lib/delivery/distance";
import { calculateDeliveryFee } from "@/lib/delivery/pricing";
import { db } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const slug = String(body.slug ?? "").trim();
    const destination = String(body.destination ?? "").trim();

    if (
      !slug ||
      slug.length > 120 ||
      !destination ||
      destination.length > 300
    ) {
      return NextResponse.json(
        { error: "Informe o restaurante e o endereço de entrega." },
        { status: 400 },
      );
    }

    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      include: {
        deliveryFeeRanges: {
          orderBy: { minDistanceKm: "asc" },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante não encontrado." },
        { status: 404 },
      );
    }

    if (!restaurant.deliveryEnabled) {
      return NextResponse.json(
        { error: "Este restaurante não está realizando entregas." },
        { status: 400 },
      );
    }

    if (!restaurant.deliveryFeeRanges.length) {
      return NextResponse.json(
        { error: "As taxas de entrega ainda não foram configuradas." },
        { status: 400 },
      );
    }

    const distanceKm = await calculateDrivingDistance(
      restaurant.deliveryAddress,
      destination,
    );

    const result = calculateDeliveryFee(
      distanceKm,
      restaurant.deliveryMaxDistanceKm,
      restaurant.deliveryFeeRanges,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao calcular entrega:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível calcular a entrega.",
      },
      { status: 500 },
    );
  }
}
