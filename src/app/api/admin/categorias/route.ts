import { NextResponse } from "next/server";

import { authorizeAdmin, validateRequestOrigin } from "@/lib/admin-api";
import { db } from "@/lib/prisma";

export const runtime = "nodejs";

async function getRestaurant() {
  return db.restaurant.findFirst({
    select: { id: true },
  });
}

// Listar categorias
export async function GET() {
  const unauthorized = await authorizeAdmin();
  if (unauthorized) return unauthorized;

  try {
    const restaurant = await getRestaurant();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante não encontrado." },
        { status: 404 },
      );
    }

    const categories = await db.menuCategory.findMany({
      where: { restaurantId: restaurant.id },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Erro ao listar categorias:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar as categorias." },
      { status: 500 },
    );
  }
}

// Cadastrar categoria
export async function POST(request: Request) {
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
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name || name.length > 80) {
      return NextResponse.json(
        { error: "Informe um nome de até 80 caracteres." },
        { status: 400 },
      );
    }

    const restaurant = await getRestaurant();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante não encontrado." },
        { status: 404 },
      );
    }

    const existing = await db.menuCategory.findFirst({
      where: {
        restaurantId: restaurant.id,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe uma categoria com esse nome." },
        { status: 409 },
      );
    }

    const category = await db.menuCategory.create({
      data: {
        name,
        restaurantId: restaurant.id,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Erro ao cadastrar categoria:", error);

    return NextResponse.json(
      { error: "Não foi possível cadastrar a categoria." },
      { status: 500 },
    );
  }
}
