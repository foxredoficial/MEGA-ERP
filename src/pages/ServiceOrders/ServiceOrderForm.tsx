import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Wrench } from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ContactSearch } from "@/components/ContactSearch";
import { formatBRLFromCents } from "@/lib/money";
import { getServiceOrder, upsertServiceOrder, type ServiceOrderStatus } from "@/lib/api_service_orders";

export function ServiceOrderForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<ServiceOrderStatus>("open");
  const [description, setDescription] = useState("");
  const [totalCents, setTotalCents] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!id) {
          if (!cancelled) setLoading(false);
          return;
        }
        const existing = await getServiceOrder(id);
        if (!existing) {
          navigate("/app/ordens-servico");
          return;
        }
        if (cancelled) return;
        setCustomerId(existing.customerId);
        setCustomerName(existing.customerName);
        setDate(existing.date);
        setStatus(existing.status);
        setDescription(existing.description);
        setTotalCents(existing.totalCents);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const header = id ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço";
  const totalDisplay = useMemo(() => formatBRLFromCents(totalCents), [totalCents]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      const order = await upsertServiceOrder({
        id,
        customerId,
        customerName,
        date,
        status,
        description,
        totalCents,
      });
      navigate(`/app/ordens-servico/${order.id}`);
    } catch (err) {
      alert("Erro ao salvar OS: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <BlingLayout>
        <div className="pt-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </BlingLayout>
    );
  }

  return (
    <BlingLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/app/ordens-servico" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                {header}
              </h1>
              <p className="text-sm text-slate-500 mt-1">Total: {totalDisplay}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</label>
              <div className="mt-2">
                <ContactSearch
                  selectedContactId={customerId ?? undefined}
                  onSelect={(c) => {
                    setCustomerId(c.id);
                    setCustomerName(c.name);
                  }}
                />
              </div>
              <div className="mt-2">
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome do cliente" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</label>
              <Input
                className="mt-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Troca de tela / Manutenção / Formatação"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</label>
              <Input className="mt-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
              <select
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                value={status}
                onChange={(e) => setStatus(e.target.value as ServiceOrderStatus)}
              >
                <option value="open">Em aberto</option>
                <option value="in_progress">Em andamento</option>
                <option value="completed">Concluída</option>
                <option value="canceled">Cancelada</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor (R$)</label>
              <Input
                className="mt-2"
                type="number"
                inputMode="decimal"
                value={(totalCents / 100).toFixed(2)}
                onChange={(e) => {
                  const v = Number(String(e.target.value).replace(",", "."));
                  const cents = Number.isFinite(v) ? Math.round(v * 100) : 0;
                  setTotalCents(Math.max(0, cents));
                }}
              />
            </div>
          </div>
        </div>
      </form>
    </BlingLayout>
  );
}

