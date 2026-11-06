import { NextResponse } from "next/server";

import { authorizeAdmin, validateRequestOrigin } from "@/lib/admin-api";
import { cloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

async function uploadImage(file: File) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Formatos permitidos: JPG, PNG e WEBP.");
  }

  if (!file.size || file.size > MAX_IMAGE_SIZE) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await cloudinary.uploader.upload(
    `data:${file.type};base64,${buffer.toString("base64")}`,
    {
      folder: "iluminado-cafe/restaurant",
      resource_type: "image",
      transformation: [{ width: 1600, height: 1600, crop: "limit" }],
    },
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

async function getRestaurant() {
  return db.restaurant.findFirst();
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

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error("Erro ao buscar restaurante:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar as configurações." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await authorizeAdmin();
  if (unauthorized) return unauthorized;

  if (!validateRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }

  const uploadedIds: string[] = [];

  try {
    const formData = await request.formData();

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name || name.length > 120) {
      return NextResponse.json(
        { error: "Informe um nome válido." },
        { status: 400 },
      );
    }

    if (!description || description.length > 2000) {
      return NextResponse.json(
        { error: "Informe uma descrição válida." },
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

    let avatarImageUrl = restaurant.avatarImageUrl;
    let coverImageUrl = restaurant.coverImageUrl;

    let avatarImagePublicId = restaurant.avatarImagePublicId;
    let coverImagePublicId = restaurant.coverImagePublicId;

    const avatar = formData.get("avatarImage");
    const cover = formData.get("coverImage");

    if (avatar instanceof File && avatar.size > 0) {
      const uploaded = await uploadImage(avatar);

      uploadedIds.push(uploaded.publicId);

      avatarImageUrl = uploaded.url;
      avatarImagePublicId = uploaded.publicId;
    }

    if (cover instanceof File && cover.size > 0) {
      const uploaded = await uploadImage(cover);

      uploadedIds.push(uploaded.publicId);

      coverImageUrl = uploaded.url;
      coverImagePublicId = uploaded.publicId;
    }
    const whatsappPhone = String(formData.get("whatsappPhone") ?? "").replace(
      /\D/g,
      "",
    );

    if (whatsappPhone && !/^\d{12,13}$/.test(whatsappPhone)) {
      return NextResponse.json(
        { error: "Número de WhatsApp inválido. Utilize DDI e DDD." },
        { status: 400 },
      );
    }
    const updatedRestaurant = await db.restaurant.update({
      where: { id: restaurant.id },

      data: {
        name,
        description,
        avatarImageUrl,
        coverImageUrl,
        avatarImagePublicId,
        coverImagePublicId,
        whatsappPhone,
      },
    });

    // Exclui imagens antigas somente depois de salvar no banco.
    const oldImages: string[] = [];

    if (
      avatar instanceof File &&
      avatar.size > 0 &&
      restaurant.avatarImagePublicId
    ) {
      oldImages.push(restaurant.avatarImagePublicId);
    }

    if (
      cover instanceof File &&
      cover.size > 0 &&
      restaurant.coverImagePublicId
    ) {
      oldImages.push(restaurant.coverImagePublicId);
    }

    await Promise.all(
      oldImages.map(async (publicId) => {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error("Erro ao excluir imagem antiga:", error);
        }
      }),
    );

    return NextResponse.json({
      message: "Configurações atualizadas com sucesso!",
      restaurant: updatedRestaurant,
    });
  } catch (error) {
    // Remove uploads novos caso o salvamento falhe.
    await Promise.all(
      uploadedIds.map((publicId) =>
        cloudinary.uploader.destroy(publicId).catch(() => null),
      ),
    );

    console.error("Erro ao atualizar configurações:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar as configurações.",
      },
      { status: 400 },
    );
  }
}
