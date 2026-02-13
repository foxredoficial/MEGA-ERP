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
import { AdvancedDateFilter } from "@/components/filters/AdvancedDateFilter";
import { computePreset, inRange, suggestedGranularity, type DateFilterValue } from "@/components/filters/dateRange";
import { Pagination } from "@/components/ui/Pagination";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);

  const [dateFilter, setDateFilter] = useState<DateFilterValue>(() => {
    const r = computePreset("this_month");
    return { preset: "this_month", range: r, granularity: suggestedGranularity(r), compare: { mode: "previous_period" } };
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    void load();
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFilter.range.start.getTime(), dateFilter.range.end.getTime()]);

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

  async function confirmBulkCancel() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      setCanceling(true);
      await Promise.all(ids.map((id) => cancelServiceOrder(id)));
      setSelectedIds(new Set());
      await load();
    } finally {
      setCanceling(false);
      setBulkCancelOpen(false);
    }
  }

  const filteredOrders = useMemo(
    () =>
      orders.filter((os) => {
        const d = new Date(os.date);
        if (!Number.isNaN(d.getTime()) && !inRange(d, dateFilter.range)) return false;
        return true;
      }),
    [orders, dateFilter.range]
  );

  const total = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedOrders = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filteredOrders.slice(start, end);
  }, [filteredOrders, page, pageSize, totalPages]);

  const selectedCount = selectedIds.size;
  const allVisibleSelected = pagedOrders.length > 0 && pagedOrders.every((o) => selectedIds.has(o.id));

  function toggleAllVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const o of pagedOrders) {
        if (checked) next.add(o.id);
        else next.delete(o.id);
      }
      return next;
    });
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

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
             <AdvancedDateFilter
               label="Data"
               value={dateFilter}
               onChange={setDateFilter}
               showCompare={false}
               showGranularity={false}
               allowedGranularities={["day", "week", "month"]}
             />
          </div>
        </div>

        {selectedCount > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-slate-700">Selecionados: <span className="font-semibold">{selectedCount}</span></div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setSelectedIds(new Set())}>
                Limpar seleção
              </Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setBulkCancelOpen(true)}>
                Cancelar selecionados
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 w-14">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleAllVisible(e.target.checked)}
                    />
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
                {pagedOrders.map((os) => (
                  <tr key={os.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedIds.has(os.id)}
                        onChange={(e) => toggleOne(os.id, e.target.checked)}
                      />
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

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
          <Pagination
            label="Ordens"
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
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

      <ConfirmationDialog
        isOpen={bulkCancelOpen}
        onClose={() => setBulkCancelOpen(false)}
        onConfirm={() => void confirmBulkCancel()}
        title="Cancelar selecionados"
        description={`Deseja cancelar ${selectedCount} OS?`}
        confirmText="Cancelar"
        variant="danger"
        loading={canceling}
      />
    </BlingLayout>
  );
}
