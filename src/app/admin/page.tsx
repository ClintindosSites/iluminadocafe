import type { OrderStatus } from "@prisma/client";
import {
  ArrowRight,
  CheckCircle2,
  ChefHat,
  Clock,
  Coffee,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import AdminStats from "@/components/admin/AdminStats";
import { db } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusConfig: Record<
  OrderStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "Pendente",
    className: "bg-yellow-50 text-yellow-700",
    icon: Clock,
  },
  IN_PREPARATION: {
    label: "Em preparação",
    className: "bg-blue-50 text-blue-700",
    icon: ChefHat,
  },
  PAYMENT_CONFIRMED: {
    label: "Pagamento confirmado",
    className: "bg-green-50 text-green-700",
    icon: CheckCircle2,
  },
  PAYMENT_FAILED: {
    label: "Pagamento recusado",
    className: "bg-red-50 text-red-700",
    icon: XCircle,
  },
  FINISHED: {
    label: "Finalizado",
    className: "bg-gray-100 text-gray-700",
    icon: CheckCircle2,
  },
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminDashboard() {
  const restaurant = await db.restaurant.findFirst({
    include: {
      _count: {
        select: {
          products: true,
          menuCategories: true,
          orders: true,
        },
      },
    },
  });

  if (!restaurant) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
          <Coffee size={38} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900">
          Bem-vindo ao Iluminado Café!
        </h2>

        <p className="mt-2 max-w-md text-sm text-gray-500">
          Ainda não encontramos um restaurante cadastrado no banco de dados.
          Cadastre as informações do estabelecimento para começar.
        </p>

        <Link
          href="/admin/configuracoes"
          className="mt-6 rounded-xl bg-amber-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-800"
        >
          Configurar restaurante
        </Link>
      </div>
    );
  }

  const [totalRevenue, recentOrders, totalOrders] = await Promise.all([
    db.order.aggregate({
      where: {
        restaurantId: restaurant.id,
        status: {
          in: ["PAYMENT_CONFIRMED", "IN_PREPARATION", "FINISHED"],
        },
      },
      _sum: {
        total: true,
      },
    }),

    db.order.findMany({
      where: {
        restaurantId: restaurant.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        customerName: true,
        total: true,
        status: true,
        createdAt: true,
      },
    }),

    db.order.count({
      where: {
        restaurantId: restaurant.id,
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Boas-vindas */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-amber-700">
            Painel administrativo
          </p>

          <h2 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
            Olá, administrador! 👋
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Aqui está o resumo do seu restaurante{" "}
            <span className="font-semibold text-gray-700">
              {restaurant.name}
            </span>
            .
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <Coffee size={19} className="text-amber-700" />

          <span className="text-sm font-medium text-gray-700">
            Iluminado Café
          </span>
        </div>
      </section>

      {/* Indicadores */}
      <section>
        <AdminStats
          totalOrders={totalOrders}
          totalRevenue={totalRevenue._sum.total ?? 0}
          totalProducts={restaurant._count.products}
          totalCategories={restaurant._count.menuCategories}
        />
      </section>

      {/* Pedidos recentes */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center md:px-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Pedidos recentes
            </h3>

            <p className="mt-1 text-sm text-gray-400">
              Acompanhe os últimos pedidos do restaurante.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
            <ShoppingBag size={17} />
            {totalOrders} pedidos registrados
          </div>
        </div>

        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400">
              <ShoppingBag size={29} />
            </div>

            <h4 className="mt-4 font-semibold text-gray-800">
              Nenhum pedido encontrado
            </h4>

            <p className="mt-1 text-sm text-gray-400">
              Quando seus clientes realizarem pedidos, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <>
            {/* Tabela para computadores */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Pedido</th>
                    <th className="px-6 py-4 font-semibold">Cliente</th>
                    <th className="px-6 py-4 font-semibold">Data</th>
                    <th className="px-6 py-4 font-semibold">Valor</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((order) => {
                    const status = statusConfig[order.status];
                    const StatusIcon = status.icon;

                    return (
                      <tr
                        key={order.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                          #{order.id}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {order.customerName}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </td>

                        <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                          {formatCurrency(order.total)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
                          >
                            <StatusIcon size={14} />
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Lista para celulares */}
            <div className="divide-y divide-gray-100 md:hidden">
              {recentOrders.map((order) => {
                const status = statusConfig[order.status];
                const StatusIcon = status.icon;

                return (
                  <div key={order.id} className="space-y-3 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800">
                        Pedido #{order.id}
                      </span>

                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(order.total)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500">
                      {order.customerName}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-gray-400">
                        {formatDate(order.createdAt)}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
                      >
                        <StatusIcon size={13} />
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Atalhos */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/produtos"
          className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-amber-300 hover:shadow-sm"
        >
          <div>
            <h3 className="font-bold text-gray-800">Gerenciar produtos</h3>

            <p className="mt-1 text-sm text-gray-400">
              Cadastre e atualize seu cardápio.
            </p>
          </div>

          <ArrowRight
            size={20}
            className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-amber-700"
          />
        </Link>

        <Link
          href="/admin/categorias"
          className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-amber-300 hover:shadow-sm"
        >
          <div>
            <h3 className="font-bold text-gray-800">Gerenciar categorias</h3>

            <p className="mt-1 text-sm text-gray-400">
              Organize os produtos do restaurante.
            </p>
          </div>

          <ArrowRight
            size={20}
            className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-amber-700"
          />
        </Link>
      </section>
    </div>
  );
}
