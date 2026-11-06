"use client";

import {
  ChevronRight,
  ClipboardList,
  Coffee,
  LayoutDashboard,
  Package,
  Settings,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Pedidos",
    href: "/admin/pedidos",
    icon: ClipboardList,
  },
  {
    label: "Produtos",
    href: "/admin/produtos",
    icon: Package,
  },
  {
    label: "Categorias",
    href: "/admin/categorias",
    icon: Tags,
  },
  {
    label: "Configurações",
    href: "/admin/configuracoes",
    icon: Settings,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 border-b border-gray-200 bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      {/* Identidade visual */}
      <div className="flex h-20 items-center gap-3 border-b border-gray-100 px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          <Coffee size={24} strokeWidth={2} />
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900">Iluminado Café</h2>

          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Painel administrativo
          </p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="p-4">
        <p className="mb-3 hidden px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 lg:block">
          Menu principal
        </p>

        <div className="flex gap-2 overflow-x-auto lg:flex-col">
          {menuItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-amber-100 text-amber-900"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={19} strokeWidth={1.9} />

                <span>{item.label}</span>

                {isActive && (
                  <ChevronRight size={16} className="ml-auto hidden lg:block" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Rodapé */}
      <div className="mt-4 hidden border-t border-gray-100 px-6 py-5 lg:block">
        <p className="text-xs text-gray-400">Iluminado Café</p>

        <p className="mt-1 text-xs text-gray-400">
          Gerenciamento do restaurante
        </p>
      </div>
    </aside>
  );
}
