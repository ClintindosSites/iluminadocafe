import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/prisma";
import Image from "next/image";
import { notFound } from "next/navigation";
import ConsumptionMethodOption from "./components/ConsumptionMethodOption";

interface RestaurantPageProps {
  params: Promise<{ slug: string }>;
}

const RestaurantPage = async ({ params }: RestaurantPageProps) => {
  const { slug } = await params;
  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) {
    return notFound();
  }
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-red-800 px-4">
      <div className="flex flex-col items-center gap-2">
        <Image
          src={restaurant?.avatarImageUrl}
          alt={restaurant?.name}
          width={200}
          height={200}
        />
        <h2 className="font-semibold text-white">{restaurant.name}</h2>
      </div>
      <div className="space-y-2 pb-10 pt-2 text-center">
        <h3 className="text-2xl font-semibold text-white">Seja bem vindo!</h3>
        <p className="text-white">
          Escolha como prefere aproveitar a sua refeição.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 pb-14">
        <ConsumptionMethodOption
          buttonText="Comer em casa"
          imageAlt="Para receber o almoço em casa"
          imageUrl="dine_in.svg"
          option="DINE_IN"
          slug={slug}
        />
        <ConsumptionMethodOption
          buttonText="Retire na loja"
          imageAlt="Para fazer a retirada no estabelecimento"
          imageUrl="take_away.svg"
          option="TAKEAWAY"
          slug={slug}
        />
      </div>
    </div>
  );
};

export default RestaurantPage;
