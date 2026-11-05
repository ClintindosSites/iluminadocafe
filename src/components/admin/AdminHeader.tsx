"use client";

import { Bell, Coffee } from "lucide-react";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/produtos": "Produtos",
  "/admin/categorias": "Categorias",
  "/admin/configuracoes": "Configurações",
};

export default function AdminHeader() {
  const pathname = usePathname();

  const currentTitle = pageTitles[pathname] || "Painel administrativo";

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-200 bg-white px-5 md:px-8">
      {/* Título */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800 lg:hidden">
          <Coffee size={21} />
        </div>

        <div>
          <h1 className="text-lg font-bold text-gray-900 md:text-xl">
            {currentTitle}
          </h1>

          <p className="hidden text-xs text-gray-400 sm:block">
            Gerencie seu restaurante em um só lugar.
          </p>
        </div>
      </div>

      {/* Ações e identificação */}
      <div className="flex items-center gap-3 md:gap-5">
        <div className="hidden items-center gap-2 rounded-full bg-green-50 px-3 py-2 sm:flex">
          <span className="h-2 w-2 rounded-full bg-green-500" />

          <span className="text-xs font-semibold text-green-700">
            Painel administrativo
          </span>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          <Bell size={19} strokeWidth={1.8} />
        </div>

        <div className="hidden h-9 w-px bg-gray-200 sm:block" />

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-gray-800">Administrador</p>

            <p className="text-xs text-gray-400">Iluminado Café</p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-900">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
