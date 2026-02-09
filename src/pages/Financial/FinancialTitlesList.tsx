import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Search } from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ContactSearch } from "@/components/ContactSearch";
import {
  listFinancialTitles,
  createFinancialTitle,
  registerPayment,
  type FinancialTitle,
  type FinancialTitleKind,
  type FinancialPaymentMethod,
} from "@/lib/api_financial_titles";
import { addTransaction, getCurrentOpenSession } from "@/lib/api_cash";
import { formatCurrency } from "@/lib/utils";

const STATUS_BADGE: Record<FinancialTitle["status"], { label: string; tone: "blue" | "green" | "slate" | "red" }> = {
  open: { label: "Em aberto", tone: "blue" },
  partial: { label: "Parcial", tone: "slate" },
  paid: { label: "Pago", tone: "green" },
  canceled: { label: "Cancelado", tone: "red" },
};

export function FinancialTitlesList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const kind = (searchParams.get("kind") as FinancialTitleKind | null) ?? "ar";

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [titles, setTitles] = useState<FinancialTitle[]>([]);
  const [paying, setPaying] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTitle, setPayTitle] = useState<FinancialTitle | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<FinancialPaymentMethod>("money");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPartyId, setNewPartyId] = useState<string | null>(null);
  const [newPartyName, setNewPartyName] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [newAmount, setNewAmount] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const header = kind === "ar" ? "Contas a Receber" : "Contas a Pagar";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listFinancialTitles({ kind });
      setTitles(data);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return titles;
    return titles.filter((t) => {
      return (
        t.description.toLowerCase().includes(q) ||
        (t.partyName ?? "").toLowerCase().includes(q) ||
        t.dueDate.includes(q)
      );
    });
  }, [query, titles]);

  function openPay(title: FinancialTitle) {
    if (title.status === "paid" || title.status === "canceled") return;
    const remaining = Math.max(0, title.amount - title.paidAmount);
    if (remaining <= 0) return;
    setPayTitle(title);
    setPayAmount(String(remaining));
    setPayMethod("money");
    setShowPayModal(true);
  }

  function openCreate() {
    setNewPartyId(null);
    setNewPartyName("");
    setNewDescription("");
    setNewAmount("");
    setNewDueDate(new Date().toISOString().slice(0, 10));
    setShowCreateModal(true);
  }

  async function confirmCreate() {
    const amount = Number(String(newAmount).replace(",", "."));
    if (!newDescription.trim()) {
      alert("Informe uma descrição.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Informe um valor válido.");
      return;
    }
    if (!newDueDate) {
      alert("Informe o vencimento.");
      return;
    }

    try {
      setCreating(true);
      await createFinancialTitle({
        kind,
        origin: "manual",
        partyId: newPartyId,
        partyName: newPartyName.trim() || null,
        description: newDescription.trim(),
        amount,
        dueDate: newDueDate,
      });
      setShowCreateModal(false);
      await load();
    } catch (e) {
      alert("Erro ao criar título: " + (e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function confirmPay() {
    if (!payTitle) return;
    const amount = Number(String(payAmount).replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    try {
      setPaying(true);
      const beforePaid = payTitle.paidAmount;
      const updated = await registerPayment({
        titleId: payTitle.id,
        amount,
        method: payMethod,
        notes: "Baixa manual (Financeiro)",
      });

      const applied = Math.max(0, updated.paidAmount - beforePaid);
      const isImmediate = payMethod === "money" || payMethod === "pix" || payMethod === "credit" || payMethod === "debit";
      if (applied > 0 && isImmediate) {
        const openSession = await getCurrentOpenSession();
        if (openSession) {
          await addTransaction(
            openSession.id,
            kind === "ar" ? "in" : "out",
            kind === "ar" ? "receipt" : "payment",
            applied,
            `${kind === "ar" ? "Recebimento" : "Pagamento"}: ${payTitle.description}`,
            payMethod,
            { refId: payTitle.id, meta: { financialTitleId: payTitle.id, kind, origin: payTitle.origin } }
          );
        }
      }

      setShowPayModal(false);
      setPayTitle(null);
      setPayAmount("");
      await load();
    } catch (e) {
      alert("Erro ao dar baixa: " + (e as Error).message);
    } finally {
      setPaying(false);
    }
  }

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{header}</h1>
            <p className="text-sm text-slate-500 mt-1">Títulos gerados por PDV, pedidos e lançamentos manuais.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={kind === "ar" ? "primary" : "outline"}
              className={kind === "ar" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
              onClick={() => setSearchParams({ kind: "ar" })}
            >
              <ArrowDownRight className="w-4 h-4 mr-2" />
              Receber
            </Button>
            <Button variant={kind === "ap" ? "primary" : "outline"} onClick={() => setSearchParams({ kind: "ap" })}>
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Pagar
            </Button>

            <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={openCreate}>
              Novo título
            </Button>
          </div>
        </div>

        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por descrição, cliente/fornecedor, vencimento..."
              className="pl-10 border-none shadow-none focus-visible:ring-0 bg-transparent h-12 text-base"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Cliente/Fornecedor</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                  <th className="px-6 py-4 text-right">Pago</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 text-slate-600">{t.dueDate}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{t.description}</div>
                      <div className="text-xs text-slate-500">Origem: {t.origin}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{t.partyName ?? "-"}</td>
                    <td className="px-6 py-4">
                      <Badge tone={STATUS_BADGE[t.status].tone}>{STATUS_BADGE[t.status].label}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(t.amount)}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{formatCurrency(t.paidAmount)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={t.status === "paid" || t.status === "canceled"}
                        onClick={() => openPay(t)}
                      >
                        Dar baixa
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      Nenhum título encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showPayModal && payTitle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="text-lg font-bold text-slate-900">Dar baixa</div>
              <div className="text-sm text-slate-500 mt-1">{payTitle.description}</div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="space-y-4 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</label>
                    <Input
                      type="number"
                      className="mt-2 h-12"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0,00"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Método</label>
                    <select
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as FinancialPaymentMethod)}
                    >
                      <option value="money">Dinheiro</option>
                      <option value="pix">PIX</option>
                      <option value="credit">Crédito</option>
                      <option value="debit">Débito</option>
                      <option value="boleto">Boleto</option>
                      <option value="crediario">Crediário</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 flex items-center justify-between">
                  <span>Em aberto</span>
                  <span className="font-semibold">{formatCurrency(Math.max(0, payTitle.amount - payTitle.paidAmount))}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPayModal(false)} disabled={paying}>
                Cancelar
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void confirmPay()} disabled={paying}>
                {paying ? "Processando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="text-lg font-bold text-slate-900">Novo título ({kind === "ar" ? "a receber" : "a pagar"})</div>
              <div className="text-sm text-slate-500 mt-1">Lançamento manual</div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="space-y-4 max-w-3xl">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {kind === "ar" ? "Cliente" : "Fornecedor"}
                  </label>
                  <div className="mt-2">
                    <ContactSearch
                      contactType={kind === "ar" ? "cliente" : "fornecedor"}
                      selectedContactId={newPartyId ?? undefined}
                      onSelect={(c) => {
                        setNewPartyId(c.id);
                        setNewPartyName(c.name);
                      }}
                    />
                  </div>
                  <div className="mt-2">
                    <Input value={newPartyName} onChange={(e) => setNewPartyName(e.target.value)} placeholder="Nome (opcional)" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</label>
                  <Input
                    className="mt-2 h-12"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Ex.: Mensalidade / Serviço / Compra"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</label>
                    <Input
                      type="number"
                      className="mt-2 h-12"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencimento</label>
                    <Input type="date" className="mt-2 h-12" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void confirmCreate()} disabled={creating}>
                {creating ? "Criando..." : "Criar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </BlingLayout>
  );
}
