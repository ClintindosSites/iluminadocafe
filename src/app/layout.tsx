import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { CartProvider } from "./[slug]/menu/contexts/cart";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Iluminado Café",
  description:
    "Comida caseira com aquele sabor mineiro que encanta todo brasileiro!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-Br">
      <body className={`${poppins.className} antialiased`}>
        <CartProvider>{children}</CartProvider>
        <Toaster className="bg-red-700 text-white" />
      </body>
    </html>
  );
}
