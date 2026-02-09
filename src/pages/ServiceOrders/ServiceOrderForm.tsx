import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Wrench, Plus, Trash2 } from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ContactSearch } from "@/components/ContactSearch";
import { formatBRLFromCents } from "@/lib/money";
import { formatCurrency } from "@/lib/utils";
import { getServiceOrder, upsertServiceOrder, type ServiceOrderItem, type ServiceOrderItemKind, type ServiceOrderStatus } from "@/lib/api_service_orders";

export function ServiceOrderForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<ServiceOrderStatus>("open");
  const [equipment, setEquipment] = useState("");
  const [problem, setProblem] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [solution, setSolution] = useState("");
  const [notes, setNotes] = useState("");
  const [totalCents, setTotalCents] = useState(0);
  const [items, setItems] = useState<Array<Omit<ServiceOrderItem, "id">>>([]);

  function buildDescription() {
    const parts: string[] = [];
    if (equipment.trim()) parts.push(`Equipamento: ${equipment.trim()}`);
    if (problem.trim()) parts.push(`Problema: ${problem.trim()}`);
    if (diagnosis.trim()) parts.push(`Diagnóstico: ${diagnosis.trim()}`);
    if (solution.trim()) parts.push(`Solução: ${solution.trim()}`);
    if (notes.trim()) parts.push(`Obs: ${notes.trim()}`);
    return parts.join("\n\n");
  }

  function extractField(input: string, label: string) {
    const re = new RegExp(`(?:^|\\n)${label}:\\s*([^\\n]*)`, "i");
    const m = input.match(re);
    return m ? (m[1] ?? "").trim() : "";
  }

  function recomputeItem(it: Omit<ServiceOrderItem, "id">) {
    const qty = Number(it.quantity) || 0;
    const unit = Number(it.unitPrice) || 0;
    const disc = Number(it.discount) || 0;
    const computed = Math.max(0, qty * unit - disc);
    return { ...it, quantity: qty, unitPrice: unit, discount: disc, total: computed };
  }

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
        const raw = existing.description ?? "";
        const parsedEquipment = extractField(raw, "Equipamento");
        const parsedProblem = extractField(raw, "Problema");
        const parsedDiagnosis = extractField(raw, "Diagnóstico");
        const parsedSolution = extractField(raw, "Solução");
        const parsedNotes = extractField(raw, "Obs");

        const seemsStructured = Boolean(parsedEquipment || parsedProblem || parsedDiagnosis || parsedSolution || parsedNotes);
        setEquipment(parsedEquipment);
        setProblem(seemsStructured ? parsedProblem : raw);
        setDiagnosis(parsedDiagnosis);
        setSolution(parsedSolution);
        setNotes(parsedNotes);

        const loadedItems = (existing.items ?? []).map((it) => ({
          kind: it.kind,
          productId: it.productId ?? null,
          description: it.description,
          quantity: Number(it.quantity ?? 0),
          unitPrice: Number(it.unitPrice ?? 0),
          discount: Number(it.discount ?? 0),
          total: Number(it.total ?? 0),
        }));
        setItems(loadedItems);
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

  const itemsTotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;
    setTotalCents(Math.round(itemsTotal * 100));
  }, [itemsTotal]);

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
        description: buildDescription() || "OS",
        totalCents,
        items,
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
                  contactType="cliente"
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
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipamento</label>
              <Input className="mt-2" value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Ex.: Celular / Notebook / Impressora" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Problema relatado</label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[110px]"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="Descreva o problema informado pelo cliente"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnóstico</label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[110px]"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Análise técnica"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Solução</label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[110px]"
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  placeholder="Serviço realizado"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Observações</label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[110px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações internas"
                />
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Itens (mão de obra / peças)</label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setItems((prev) => [
                      ...prev,
                      recomputeItem({ kind: "labor", productId: null, description: "", quantity: 1, unitPrice: 0, discount: 0, total: 0 }),
                    ])
                  }
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar item
                </Button>
              </div>

              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left font-semibold px-3 py-2 w-40">Tipo</th>
                      <th className="text-left font-semibold px-3 py-2">Descrição</th>
                      <th className="text-right font-semibold px-3 py-2 w-24">Qtd</th>
                      <th className="text-right font-semibold px-3 py-2 w-28">Unit</th>
                      <th className="text-right font-semibold px-3 py-2 w-28">Desc</th>
                      <th className="text-right font-semibold px-3 py-2 w-28">Total</th>
                      <th className="px-3 py-2 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-slate-500" colSpan={7}>
                          Nenhum item adicionado.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => (
                        <tr key={idx} className="border-t border-slate-200">
                          <td className="px-3 py-2">
                            <select
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                              value={it.kind}
                              onChange={(e) =>
                                setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, kind: e.target.value as ServiceOrderItemKind } : p)))
                              }
                            >
                              <option value="labor">Mão de obra</option>
                              <option value="part">Peça</option>
                              <option value="service">Serviço</option>
                              <option value="fee">Taxa</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={it.description}
                              onChange={(e) =>
                                setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, description: e.target.value } : p)))
                              }
                              placeholder="Descrição"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.001"
                              value={Number.isFinite(it.quantity) ? it.quantity : 0}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((p, i) => (i === idx ? recomputeItem({ ...p, quantity: Number(e.target.value) }) : p))
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={Number.isFinite(it.unitPrice) ? it.unitPrice : 0}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((p, i) => (i === idx ? recomputeItem({ ...p, unitPrice: Number(e.target.value) }) : p))
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={Number.isFinite(it.discount) ? it.discount : 0}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((p, i) => (i === idx ? recomputeItem({ ...p, discount: Number(e.target.value) }) : p))
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-800">{formatCurrency(it.total)}</td>
                          <td className="px-3 py-2 text-right">
                            <Button type="button" variant="outline" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
                disabled={items.length > 0}
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
