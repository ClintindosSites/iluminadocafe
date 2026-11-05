import { DollarSign, Package, ShoppingBag, Tags } from "lucide-react";

interface AdminStatsProps {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCategories: number;
}

export default function AdminStats({
  totalOrders,
  totalRevenue,
  totalProducts,
  totalCategories,
}: AdminStatsProps) {
  const stats = [
    {
      title: "Total de pedidos",
      value: totalOrders.toString(),
      description: "Pedidos registrados",
      icon: ShoppingBag,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Faturamento",
      value: totalRevenue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      description: "Valor total dos pedidos",
      icon: DollarSign,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Produtos cadastrados",
      value: totalProducts.toString(),
      description: "Produtos no cardápio",
      icon: Package,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Categorias",
      value: totalCategories.toString(),
      description: "Categorias cadastradas",
      icon: Tags,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor}`}
              >
                <Icon size={21} strokeWidth={1.9} />
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-2xl font-bold tracking-tight text-gray-900">
                {stat.value}
              </h3>

              <p className="mt-1 text-xs text-gray-400">{stat.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
