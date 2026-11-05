import { NextResponse } from "next/server";

import { authorizeAdmin, validateRequestOrigin } from "@/lib/admin-api";
import { cloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

async function getRestaurant() {
  return db.restaurant.findFirst({
    select: { id: true },
  });
}

function parseIngredients(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

async function uploadImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie um arquivo de imagem válido.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Formatos permitidos: JPG, PNG e WEBP.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await cloudinary.uploader.upload(
    `data:${file.type};base64,${buffer.toString("base64")}`,
    {
      folder: "iluminado-cafe/products",
      resource_type: "image",
      transformation: [{ width: 1200, height: 1200, crop: "limit" }],
    },
  );

  return {
    imageUrl: result.secure_url,
    imagePublicId: result.public_id,
  };
}

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

    const [products, categories] = await Promise.all([
      db.product.findMany({
        where: { restaurantId: restaurant.id },
        include: {
          menuCategory: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      db.menuCategory.findMany({
        where: { restaurantId: restaurant.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ products, categories });
  } catch (error) {
    console.error("Erro ao listar produtos:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os produtos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await authorizeAdmin();
  if (unauthorized) return unauthorized;

  if (!validateRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }

  let uploadedPublicId: string | undefined;

  try {
    const formData = await request.formData();

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const price = Number(formData.get("price"));
    const categoryId = String(formData.get("categoryId") ?? "");
    const ingredients = parseIngredients(formData.get("ingredients"));
    const image = formData.get("image");

    if (!name || name.length > 120) {
      return NextResponse.json(
        { error: "Informe um nome de até 120 caracteres." },
        { status: 400 },
      );
    }

    if (!description || description.length > 2000) {
      return NextResponse.json(
        { error: "Informe uma descrição válida." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(price) || price <= 0 || price > 100000) {
      return NextResponse.json(
        { error: "Informe um preço válido." },
        { status: 400 },
      );
    }

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json(
        { error: "Selecione uma imagem para o produto." },
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
      where: {
        id: categoryId,
        restaurantId: restaurant.id,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoria inválida." },
        { status: 400 },
      );
    }

    const uploaded = await uploadImage(image);
    uploadedPublicId = uploaded.imagePublicId;

    const product = await db.product.create({
      data: {
        name,
        description,
        price: Math.round(price * 100) / 100,
        ingredients,
        imageUrl: uploaded.imageUrl,
        imagePublicId: uploaded.imagePublicId,
        isAvailable: true,
        restaurantId: restaurant.id,
        menuCategoryId: category.id,
      },
      include: {
        menuCategory: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (uploadedPublicId) {
      await cloudinary.uploader.destroy(uploadedPublicId).catch(() => null);
    }

    console.error("Erro ao cadastrar produto:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível cadastrar o produto.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
