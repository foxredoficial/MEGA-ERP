import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Send, Trash2, Plus } from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ContactSearch } from "@/components/ContactSearch";
import { createDoc, getDoc, issueDoc, updateDoc, type BizDocumentItem, type BizDocumentType } from "@/lib/api_docs";
import { formatCurrency } from "@/lib/utils";

const TYPE_LABEL: Record<BizDocumentType, string> = {
  proposal: "Proposta",
  contract: "Contrato",
  purchase_order: "Pedido de Compra",
  incoming_invoice: "Nota de Entrada",
  production_order: "Ordem de Produção",
  nfe: "NFe",
  nfce: "NFC-e",
  service_invoice: "Nota de Serviço",
};

export function DocsForm() {
  const navigate = useNavigate();
  const { type, id } = useParams();
  const docType = type as BizDocumentType;

  const editingId = id && id !== "novo" ? id : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyName, setPartyName] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState<string>("");
  const [total, setTotal] = useState<number>(0);
  const [items, setItems] = useState<Omit<BizDocumentItem, "id">[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!editingId) {
          if (!cancelled) setLoading(false);
          return;
        }
        const doc = await getDoc(editingId);
        if (cancelled) return;
        setPartyId(doc.partyId);
        setPartyName(doc.partyName ?? "");
        setDate(doc.date);
        setStatus(doc.status);
        setNotes(doc.notes ?? "");
        setTotal(doc.totals.total ?? 0);
        setItems(
          (doc.items ?? []).map((it) => ({
            productId: it.productId ?? null,
            description: it.description ?? "",
            quantity: Number(it.quantity ?? 0),
            unitPrice: Number(it.unitPrice ?? 0),
            discount: Number(it.discount ?? 0),
            total: Number(it.total ?? 0),
          }))
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId]);

  const header = editingId ? `Editar ${TYPE_LABEL[docType] ?? "Documento"}` : `Novo ${TYPE_LABEL[docType] ?? "Documento"}`;
  const totalDisplay = useMemo(() => formatCurrency(total), [total]);

  const itemsTotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;
    setTotal(itemsTotal);
  }, [itemsTotal]);

  function recomputeItem(it: Omit<BizDocumentItem, "id">) {
    const qty = Number(it.quantity) || 0;
    const unit = Number(it.unitPrice) || 0;
    const disc = Number(it.discount) || 0;
    const computed = Math.max(0, qty * unit - disc);
    return { ...it, quantity: qty, unitPrice: unit, discount: disc, total: computed };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingId) {
        await updateDoc(editingId, {
          partyId,
          partyName: partyName.trim() || null,
          date,
          status,
          notes: notes.trim() || null,
          items,
          totalOverride: total,
        });
        navigate(`/app/docs/${docType}`);
        return;
      }
      const created = await createDoc({
        type: docType,
        partyId,
        partyName: partyName.trim() || null,
        date,
        status,
        notes: notes.trim() || null,
        items,
        totalOverride: total,
      });
      navigate(`/app/docs/${docType}/${created.id}`);
    } catch (e2) {
      alert("Erro ao salvar: " + (e2 as any)?.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleIssue() {
    if (!editingId) return;
    try {
      setIssuing(true);
      await issueDoc(editingId);
      const refreshed = await getDoc(editingId);
      setPartyId(refreshed.partyId);
      setPartyName(refreshed.partyName ?? "");
      setDate(refreshed.date);
      setStatus(refreshed.status);
      setNotes(refreshed.notes ?? "");
      setTotal(refreshed.totals.total ?? 0);
      setItems(
        (refreshed.items ?? []).map((it) => ({
          productId: it.productId ?? null,
          description: it.description ?? "",
          quantity: Number(it.quantity ?? 0),
          unitPrice: Number(it.unitPrice ?? 0),
          discount: Number(it.discount ?? 0),
          total: Number(it.total ?? 0),
        }))
      );
    } catch (e2) {
      alert((e2 as any)?.message ?? "Falha ao emitir.");
    } finally {
      setIssuing(false);
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

  const canIssue = editingId && (docType === "nfe" || docType === "nfce");

  return (
    <BlingLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to={`/app/docs/${docType}`} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{header}</h1>
              <p className="text-sm text-slate-500 mt-1">Total: {totalDisplay}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canIssue && (
              <Button type="button" variant="outline" onClick={() => void handleIssue()} disabled={issuing || saving}>
                <Send className="w-4 h-4 mr-2" />
                {issuing ? "Emitindo..." : "Emitir"}
              </Button>
            )}
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={saving || issuing}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente/Fornecedor</label>
              <div className="mt-2">
                <ContactSearch
                  selectedContactId={partyId ?? undefined}
                  onSelect={(c) => {
                    setPartyId(c.id);
                    setPartyName(c.name);
                  }}
                  contactType={docType === "incoming_invoice" || docType === "purchase_order" ? "fornecedor" : "cliente"}
                />
              </div>
              <div className="mt-2">
                <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Nome" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</label>
                <Input className="mt-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                <Select className="mt-2" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="draft">Rascunho</option>
                  <option value="open">Em aberto</option>
                  <option value="issued">Emitido</option>
                  <option value="canceled">Cancelado</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Observações</label>
              <textarea
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[120px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Itens</label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setItems((prev) => [
                      ...prev,
                      recomputeItem({ productId: null, description: "", quantity: 1, unitPrice: 0, discount: 0, total: 0 }),
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
                        <td className="px-3 py-3 text-slate-500" colSpan={6}>
                          Nenhum item adicionado.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => (
                        <tr key={idx} className="border-t border-slate-200">
                          <td className="px-3 py-2">
                            <Input
                              value={it.description}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, description: e.target.value } : p))
                                )
                              }
                              placeholder="Produto/Serviço"
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
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                            >
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

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total (R$)</label>
              <Input
                className="mt-2"
                type="number"
                step="0.01"
                value={Number.isFinite(total) ? total : 0}
                onChange={(e) => setTotal(Number(e.target.value))}
              />
            </div>

            {(docType === "nfe" || docType === "nfce") && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Emissão fiscal é feita pelo MEGA ERP. Verifique Dados da Empresa e Endereço antes de emitir.
              </div>
            )}
          </div>
        </div>
      </form>
    </BlingLayout>
  );
}
