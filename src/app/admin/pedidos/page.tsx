"use client";

import {
  CheckCircle2,
  ChefHat,
  Package,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Order {
  id: number;
  total: number;
  status: string;
  customerName: string;
  customerCpf: string;
  consumptionMethod: string;
  paymentMethod: string | null;
  createdAt: string;
  orderProducts: {
    id: string;
    quantity: number;
    price: number;
    product: {
      name: string;
      imageUrl: string;
    };
  }[];
}

const statusLabels: Record<string, string> = {
  PENDING: "Aguardando pagamento",
  PAYMENT_CONFIRMED: "Pagamento confirmado",
  PAYMENT_FAILED: "Pagamento recusado",
  IN_PREPARATION: "Em preparação",
  FINISHED: "Finalizado",
};

const currency = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/pedidos", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar pedidos.");
      }

      setOrders(data.orders);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();

    const interval = setInterval(loadOrders, 15000);

    return () => clearInterval(interval);
  }, [loadOrders]);

  async function updateStatus(orderId: number, status: string) {
    setUpdating(orderId);

    try {
      const response = await fetch(`/api/admin/pedidos/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar pedido.");
      }

      await loadOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setUpdating(null);
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (filter === "ALL") return true;
    return order.status === filter;
  });

  const confirmed = orders.filter(
    (order) => order.status === "PAYMENT_CONFIRMED",
  ).length;

  const preparing = orders.filter(
    (order) => order.status === "IN_PREPARATION",
  ).length;

  const finished = orders.filter((order) => order.status === "FINISHED").length;

  const tabs = [
    { value: "ALL", label: "Todos" },
    { value: "PENDING", label: "Aguardando pagamento" },
    { value: "PAYMENT_CONFIRMED", label: "Confirmados" },
    { value: "IN_PREPARATION", label: "Em preparação" },
    { value: "FINISHED", label: "Finalizados" },
    { value: "PAYMENT_FAILED", label: "Pagamento recusado" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gerenciamento de pedidos
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Acompanhe os pedidos recebidos pelo restaurante.
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-medium hover:bg-gray-50"
        >
          <RefreshCw size={17} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<ShoppingBag size={22} />}
          label="Novos pedidos"
          value={confirmed}
          color="text-green-700 bg-green-50"
        />

        <SummaryCard
          icon={<ChefHat size={22} />}
          label="Em preparação"
          value={preparing}
          color="text-amber-700 bg-amber-50"
        />

        <SummaryCard
          icon={<CheckCircle2 size={22} />}
          label="Finalizados"
          value={finished}
          color="text-blue-700 bg-blue-50"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium ${
              filter === tab.value
                ? "bg-amber-100 text-amber-900"
                : "bg-white text-gray-500 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-500">
          Carregando pedidos...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border bg-white py-16 text-center">
          <Package size={42} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">
            Nenhum pedido encontrado
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Os pedidos aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Pedido #{order.id}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>

                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  {statusLabels[order.status]}
                </span>
              </div>

              <div className="my-4 border-t" />

              <p className="font-semibold text-gray-800">
                {order.customerName}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {order.consumptionMethod === "DINE_IN"
                  ? "Consumo no estabelecimento"
                  : order.consumptionMethod === "TAKEAWAY"
                    ? "Retirada"
                    : "Pedido agendado"}
              </p>

              <div className="my-4 space-y-3">
                {order.orderProducts.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <span className="text-gray-700">
                      {item.quantity}x {item.product.name}
                    </span>
                    <span className="font-medium">
                      {currency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold text-amber-800">
                    {currency(order.total)}
                  </span>
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Pagamento: {order.paymentMethod ?? "Não informado"}
                </p>
              </div>

              {order.status === "PAYMENT_CONFIRMED" && (
                <button
                  disabled={updating === order.id}
                  onClick={() => updateStatus(order.id, "IN_PREPARATION")}
                  className="mt-5 w-full rounded-xl bg-amber-700 px-4 py-3 font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                >
                  {updating === order.id
                    ? "Atualizando..."
                    : "Iniciar preparação"}
                </button>
              )}

              {order.status === "IN_PREPARATION" && (
                <button
                  disabled={updating === order.id}
                  onClick={() => updateStatus(order.id, "FINISHED")}
                  className="mt-5 w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {updating === order.id
                    ? "Atualizando..."
                    : "Finalizar pedido"}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div
        className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
      >
        {icon}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
