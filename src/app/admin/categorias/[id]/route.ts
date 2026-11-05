import { NextResponse } from "next/server";

import { authorizeAdmin, validateRequestOrigin } from "@/lib/admin-api";
import { db } from "@/lib/prisma";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getRestaurant() {
  return db.restaurant.findFirst({
    select: { id: true },
  });
}

// Editar categoria
export async function PATCH(request: Request, context: RouteContext) {
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

    const category = await db.menuCategory.findFirst({
      where: { id, restaurantId: restaurant.id },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoria não encontrada." },
        { status: 404 },
      );
    }

    const duplicate = await db.menuCategory.findFirst({
      where: {
        restaurantId: restaurant.id,
        id: { not: id },
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Já existe outra categoria com esse nome." },
        { status: 409 },
      );
    }

    const updated = await db.menuCategory.update({
      where: { id },
      data: { name },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({ category: updated });
  } catch (error) {
    console.error("Erro ao editar categoria:", error);

    return NextResponse.json(
      { error: "Não foi possível atualizar a categoria." },
      { status: 500 },
    );
  }
}

// Excluir categoria somente quando não possuir produtos
export async function DELETE(request: Request, context: RouteContext) {
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
    const restaurant = await getRestaurant();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante não encontrado." },
        { status: 404 },
      );
    }

    await db.$transaction(
      async (tx) => {
        const category = await tx.menuCategory.findFirst({
          where: {
            id,
            restaurantId: restaurant.id,
          },
        });

        if (!category) {
          throw new Error("CATEGORY_NOT_FOUND");
        }

        const productCount = await tx.product.count({
          where: {
            menuCategoryId: id,
            restaurantId: restaurant.id,
          },
        });

        if (productCount > 0) {
          throw new Error("CATEGORY_HAS_PRODUCTS");
        }

        await tx.menuCategory.delete({
          where: { id },
        });
      },
      {
        isolationLevel: "Serializable",
      },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return NextResponse.json(
        { error: "Categoria não encontrada." },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "CATEGORY_HAS_PRODUCTS") {
      return NextResponse.json(
        {
          error:
            "Esta categoria possui produtos. Transfira os produtos antes de excluí-la.",
        },
        { status: 409 },
      );
    }

    console.error("Erro ao excluir categoria:", error);

    return NextResponse.json(
      { error: "Não foi possível excluir a categoria." },
      { status: 500 },
    );
  }
}
