import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  Wrench
} from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatBRLFromCents } from "@/lib/money";
import { cancelServiceOrder, listServiceOrders, type ServiceOrder } from "@/lib/api_service_orders";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

const STATUS_MAP: Record<string, { label: string; tone: "blue" | "green" | "slate" | "red" }> = {
  open: { label: "Em Aberto", tone: "blue" },
  in_progress: { label: "Em Andamento", tone: "slate" },
  completed: { label: "Concluída", tone: "green" },
  canceled: { label: "Cancelada", tone: "red" },
};

export function ServiceOrderList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [canceling, setCanceling] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [search]);

  async function load() {
    try {
      setLoading(true);
      const data = await listServiceOrders({ query: search });
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }

  function handleCancelClick(id: string) {
    setCancelId(id);
  }

  async function confirmCancel() {
    if (!cancelId) return;
    try {
      setCanceling(true);
      await cancelServiceOrder(cancelId);
      await load();
    } finally {
      setCanceling(false);
      setCancelId(null);
    }
  }

  const filteredOrders = useMemo(() => orders, [orders]);

  return (
    <BlingLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ordens de Serviço</h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie chamados técnicos, manutenções e serviços prestados.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2"
              onClick={() => navigate("/app/ordens-servico/novo")}
            >
              <Plus className="w-4 h-4" />
              Nova OS
            </Button>
          </div>
        </div>

        {/* Filters & Toolbar */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Pesquisar por cliente, número da OS..." 
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
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 w-14">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  </th>
                  <th className="px-6 py-4">Número</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Serviço/Descrição</th>
                  <th className="px-6 py-4">Data Entrada</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Valor Total</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredOrders.map((os) => (
                  <tr key={os.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600 font-medium">
                      {os.number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          {os.customerName.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-900">{os.customerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[200px]">{os.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {os.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={STATUS_MAP[os.status]?.tone ?? "slate"}>
                        {STATUS_MAP[os.status]?.label ?? os.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {formatBRLFromCents(os.totalCents)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200"
                        onClick={() => navigate(`/app/ordens-servico/${os.id}`)}
                      >
                        Abrir
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={os.status === "canceled"}
                        onClick={() => handleCancelClick(os.id)}
                      >
                        Cancelar
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loading && filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      Nenhuma Ordem de Serviço encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={Boolean(cancelId)}
        onClose={() => setCancelId(null)}
        onConfirm={() => void confirmCancel()}
        title="Cancelar OS"
        description="Deseja cancelar esta ordem de serviço?"
        confirmText="Cancelar"
        variant="danger"
        loading={canceling}
      />
    </BlingLayout>
  );
}
