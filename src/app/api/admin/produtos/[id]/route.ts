import { NextResponse } from "next/server";

import { authorizeAdmin, validateRequestOrigin } from "@/lib/admin-api";
import { cloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/prisma";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function uploadImage(file: File) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Formatos permitidos: JPG, PNG e WEBP.");
  }

  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    throw new Error("A imagem deve ter entre 1 byte e 5 MB.");
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

export async function PATCH(request: Request, context: RouteContext) {
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
    const { id } = await context.params;
    const formData = await request.formData();

    const existing = await db.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 },
      );
    }

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const price = Number(formData.get("price"));
    const categoryId = String(formData.get("categoryId") ?? "");
    const ingredients = String(formData.get("ingredients") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 30);

    const availabilityValue = formData.get("isAvailable");

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

    if (availabilityValue !== "true" && availabilityValue !== "false") {
      return NextResponse.json(
        { error: "Disponibilidade inválida." },
        { status: 400 },
      );
    }

    const category = await db.menuCategory.findFirst({
      where: {
        id: categoryId,
        restaurantId: existing.restaurantId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoria inválida." },
        { status: 400 },
      );
    }

    const image = formData.get("image");

    let imageData = {
      imageUrl: existing.imageUrl,
      imagePublicId: existing.imagePublicId,
    };

    if (image instanceof File && image.size > 0) {
      const uploaded = await uploadImage(image);
      uploadedPublicId = uploaded.imagePublicId;
      imageData = uploaded;
    }

    const product = await db.product.update({
      where: { id },
      data: {
        name,
        description,
        price: Math.round(price * 100) / 100,
        ingredients,
        isAvailable: availabilityValue === "true",
        menuCategoryId: category.id,
        imageUrl: imageData.imageUrl,
        imagePublicId: imageData.imagePublicId,
      },
      include: {
        menuCategory: {
          select: { id: true, name: true },
        },
      },
    });

    // Só removemos a imagem anterior se nenhum pedido a utiliza.
    if (
      uploadedPublicId &&
      existing.imagePublicId &&
      existing.imagePublicId !== uploadedPublicId
    ) {
      const orderCount = await db.orderProduct.count({
        where: { productId: id },
      });

      if (orderCount === 0) {
        await cloudinary.uploader
          .destroy(existing.imagePublicId)
          .catch((error) =>
            console.error("Não foi possível excluir a imagem antiga:", error),
          );
      }
    }

    return NextResponse.json({ product });
  } catch (error) {
    if (uploadedPublicId) {
      await cloudinary.uploader.destroy(uploadedPublicId).catch(() => null);
    }

    console.error("Erro ao editar produto:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o produto.",
      },
      { status: 400 },
    );
  }
}

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

    const product = await db.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 },
      );
    }

    await db.product.update({
      where: { id },
      data: { isAvailable: false },
    });

    return NextResponse.json({
      success: true,
      message: "Produto desativado com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao desativar produto:", error);

    return NextResponse.json(
      { error: "Não foi possível desativar o produto." },
      { status: 500 },
    );
  }
}
