"use client";

import { useContext, useState } from "react";
import Image from "next/image";
import { Prisma } from "@prisma/client";
import {
  ChefHatIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/helpers/format-currency";
import { CartContext } from "../../contexts/cart";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import CartSheet from "./cart-sheet";

interface ProductDetailsProps {
  product: Prisma.ProductGetPayload<{
    include: {
      restaurant: {
        select: {
          name: true;
          avatarImageUrl: true;
        };
      };
    };
  }>;
}

const ProductDetails = ({ product }: ProductDetailsProps) => {

  const { toggleCart, addProduct} = useContext(CartContext)
  const [quantity, setQuantity] = useState<number>(1);

  const handleDecreaseQuantity = () => {
    setQuantity((prev) => (prev === 1 ? 1 : prev - 1));
  };

  const handleIncreaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };
const handleAddToCart = () => {
  addProduct({
    ...product, 
    quantity,
  })
  toggleCart()
}

  return (
 <>
  <div className="relative z-50 mt-[-1.5rem] flex h-[calc(100vh-300px)] flex-col overflow-hidden rounded-t-3xl bg-white">
      {/* Restaurante */}
      <div className="flex items-center gap-1.5 p-1">
        <Image
          src={product.restaurant.avatarImageUrl}
          alt={product.restaurant.name}
          width={66}
          height={66}
          className="rounded-full"
        />

        <p className="text-xs text-muted-foreground">
          {product.restaurant.name}
        </p>
      </div>

      {/* Produto */}
      <h2 className="mt-2 text-xl font-semibold px-5">{product.name}</h2>

      {/* Preço e quantidade */}
      <div className="mt-3 flex items-center justify-between px-5">
        <h3 className="text-xl font-semibold">
          {formatCurrency(product.price)}
        </h3>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-8 w-8 rounded-xl"
            onClick={handleDecreaseQuantity}
          >
            <ChevronLeftIcon />
          </Button>

          <p className="w-4 text-center">{quantity}</p>

          <Button
            variant="destructive"
            className="h-8 w-8 rounded-xl"
            onClick={handleIncreaseQuantity}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      {/* Conteúdo rolável */}
      <ScrollArea className="h-full ">
        {/* Sobre */}
        <div className="space-y-3 px-5">
          <h4 className="font-semibold">Sobre</h4>

          <p className="text-sm text-muted-foreground">
            {product.description}
          </p>
        </div>

        {/* Ingredientes */}
        <div className="mt-6 space-y-3 px-5">
          <div className="flex items-center gap-1.5">
            <ChefHatIcon size={18} />
            <h4 className="font-semibold">Ingredientes</h4>
          </div>

        <ul className="list-disc px-5 text-sm text-muted-foreground">
            {product.ingredients.map((ingredient) => (
                <li key={ingredient}>{ingredient}</li>
            ))}
        </ul>
        </div>
      </ScrollArea>

      {/* Botão */}
    <div className="px-5">  <Button className="mt-6 w-full rounded-full z-50" onClick={handleAddToCart}>
        Adicionar à sacola
      </Button></div>
    </div>
<CartSheet/>
 </>
  );
};

export default ProductDetails;