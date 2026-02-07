import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Filter, Calendar, ShoppingCart } from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { listSalesOrders, type SalesOrder } from "@/lib/api_sales_orders";

const STATUS_MAP: Record<string, { label: string; tone: "blue" | "green" | "slate" | "red" }> = {
  open: { label: "Em Aberto", tone: "blue" },
  billed: { label: "Faturado", tone: "slate" },
  delivered: { label: "Entregue", tone: "green" },
  canceled: { label: "Cancelado", tone: "red" },
};

export function SalesOrderList() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<SalesOrder[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const data = await listSalesOrders();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter((order) =>
      order.customerName.toLowerCase().includes(q) || order.number.toLowerCase().includes(q)
    );
  }, [orders, search]);

  return (
    <BlingLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pedidos de Venda</h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie suas vendas, orçamentos e faturamento.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/app/vendas/pedidos/novo">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2">
                <Plus className="w-4 h-4" />
                Novo Pedido
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters & Toolbar */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Pesquisar por cliente, número do pedido..." 
              className="pl-10 border-none shadow-none focus-visible:ring-0 bg-transparent h-12 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center gap-2 pr-2 w-full md:w-auto justify-end">
             <Button variant="ghost" className="text-slate-500 hover:text-blue-600">
               <Filter className="w-4 h-4 mr-2" />
               <span className="text-sm">Filtros</span>
             </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 w-14">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  </th>
                  <th className="px-6 py-4">Número</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Itens</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Valor Total</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600 font-medium">
                      {order.number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          {order.customerName.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-900">{order.customerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-3 h-3 text-slate-400" />
                        <span>{order.totals.count} itens</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {order.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={STATUS_MAP[order.status].tone}>
                        {STATUS_MAP[order.status].label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {formatCurrency(order.totals.total)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/app/vendas/pedidos/${order.id}`}>
                        <Button variant="outline" size="sm" className="border-slate-200">
                          Abrir
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {!loading && filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BlingLayout>
  );
}
