import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Search } from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ContactSearch } from "@/components/ContactSearch";
import { MoneyInput } from "@/components/ui/MoneyInput";
import {
  listFinancialTitles,
  createFinancialTitle,
  settleTitle,
  type FinancialTitle,
  type FinancialTitleKind,
  type FinancialPaymentMethod,
} from "@/lib/api_financial_titles";
import { getCurrentOpenSession } from "@/lib/api_cash";
import { listBankAccounts, type BankAccount } from "@/lib/api_banks";
import { listCoaAccounts, listFinCategories, listFinCostCenters, type FinCategory, type FinCoaAccount, type FinCostCenter } from "@/lib/api_finance";
import { formatCurrency, splitSeedText } from "@/lib/utils";
import { Pagination } from "@/components/ui/Pagination";
import { emitAppEvent } from "@/lib/appEvents";

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
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<FinancialPaymentMethod>("money");
  const [payNotes, setPayNotes] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [paySettlement, setPaySettlement] = useState<"cash" | "bank" | "none">("cash");
  const [payCashSessionId, setPayCashSessionId] = useState<string | null>(null);
  const [payBankAccountId, setPayBankAccountId] = useState<string>("");
  const [flash, setFlash] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPartyId, setNewPartyId] = useState<string | null>(null);
  const [newPartyName, setNewPartyName] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newDueDate, setNewDueDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [newCompetenceDate, setNewCompetenceDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [newCategoryId, setNewCategoryId] = useState<string>("");
  const [newCostCenterId, setNewCostCenterId] = useState<string>("");
  const [newCoaAccountId, setNewCoaAccountId] = useState<string>("");
  const [newDocumentNumber, setNewDocumentNumber] = useState<string>("");

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [finCategories, setFinCategories] = useState<FinCategory[]>([]);
  const [finCostCenters, setFinCostCenters] = useState<FinCostCenter[]>([]);
  const [coaAccounts, setCoaAccounts] = useState<FinCoaAccount[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const header = kind === "ar" ? "Contas a Receber" : "Contas a Pagar";

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 4500);
    return () => window.clearTimeout(t);
  }, [flash]);

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

  useEffect(() => {
    listBankAccounts().then(setBankAccounts).catch(() => setBankAccounts([]));
    listFinCategories().then(setFinCategories).catch(() => setFinCategories([]));
    listFinCostCenters().then(setFinCostCenters).catch(() => setFinCostCenters([]));
    listCoaAccounts().then(setCoaAccounts).catch(() => setCoaAccounts([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [kind, query]);

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

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedTitles = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  }, [filtered, page, pageSize, totalPages]);

  function openPay(title: FinancialTitle) {
    if (title.status === "paid" || title.status === "canceled") return;
    const remaining = Math.max(0, title.amount - title.paidAmount);
    if (remaining <= 0) return;
    setPayTitle(title);
    setPayAmount(Math.round(remaining * 100) / 100);
    setPayMethod("money");
    setPayNotes("");
    setPayError(null);
    setPayBankAccountId(bankAccounts[0]?.id ?? "");
    setPayCashSessionId(null);
    setPaySettlement("cash");
    getCurrentOpenSession()
      .then((s) => {
        if (s?.id) {
          setPayCashSessionId(s.id);
          setPaySettlement("cash");
          return;
        }
        if (bankAccounts[0]?.id) setPaySettlement("bank");
        else setPaySettlement("none");
      })
      .catch(() => {
        if (bankAccounts[0]?.id) setPaySettlement("bank");
        else setPaySettlement("none");
      });
    setShowPayModal(true);
  }

  function openCreate() {
    setNewPartyId(null);
    setNewPartyName("");
    setNewDescription("");
    setNewAmount(0);
    setNewDueDate(new Date().toISOString().slice(0, 10));
    setNewCompetenceDate(new Date().toISOString().slice(0, 10));
    setNewCategoryId("");
    setNewCostCenterId("");
    setNewCoaAccountId("");
    setNewDocumentNumber("");
    setShowCreateModal(true);
  }

  async function confirmCreate() {
    if (!newDescription.trim()) {
      alert("Informe uma descrição.");
      return;
    }
    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      alert("Informe um valor válido.");
      return;
    }
    if (!newDueDate) {
      alert("Informe o vencimento.");
      return;
    }

    const activeCats = finCategories.filter((c) => c.active);
    const activeCoa = coaAccounts.filter((a) => a.active);
    if (activeCats.length > 0 && !newCategoryId) {
      alert("Selecione uma categoria.");
      return;
    }
    if (activeCoa.length > 0 && !newCoaAccountId) {
      alert("Selecione uma conta do plano.");
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
        amount: Math.round(newAmount * 100) / 100,
        dueDate: newDueDate,
        competenceDate: newCompetenceDate || newDueDate,
        categoryId: newCategoryId || null,
        costCenterId: newCostCenterId || null,
        coaAccountId: newCoaAccountId || null,
        documentNumber: newDocumentNumber.trim() ? newDocumentNumber.trim() : null,
      });
      emitAppEvent("data:changed", { scope: "finance" });
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
    const amount = Math.round(payAmount * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    const remaining = Math.max(0, payTitle.amount - payTitle.paidAmount);
    const remainingRounded = Math.round(remaining * 100) / 100;
    if (amount > remainingRounded) {
      setPayError("O valor informado é maior que o em aberto. Ajuste para dar baixa parcial ou use 'Baixar total'.");
      return;
    }

    if (paySettlement === "cash" && !payCashSessionId) {
      setPayError("Nenhum caixa aberto. Abra um caixa ou escolha Banco/Sem lançamento.");
      return;
    }
    if (paySettlement === "bank" && !payBankAccountId) {
      setPayError("Selecione uma conta bancária.");
      return;
    }

    try {
      setPaying(true);
      setPayError(null);
      const settlement =
        paySettlement === "cash"
          ? ({ type: "cash", cashSessionId: payCashSessionId! } as const)
          : paySettlement === "bank"
            ? ({ type: "bank", bankAccountId: payBankAccountId } as const)
            : ({ type: "none" } as const);

      await settleTitle({
        titleId: payTitle.id,
        amount,
        method: payMethod,
        notes: payNotes.trim() ? payNotes.trim() : "Baixa manual (Financeiro)",
        settlement,
      });

      emitAppEvent("data:changed", { scope: "finance" });
      emitAppEvent("data:changed", { scope: paySettlement === "cash" ? "cash" : "finance" });

      setShowPayModal(false);
      setPayTitle(null);
      setPayAmount(0);
      setPayNotes("");
      setFlash("Baixa registrada com sucesso.");
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
        {flash && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{flash}</div>}
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
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100 sticky top-0 z-20">
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
                {pagedTitles.map((t) => (
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

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
          <Pagination
            label="Títulos"
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

      {showPayModal && payTitle && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPayModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="text-lg font-bold text-slate-900">Dar baixa</div>
              <div className="text-sm text-slate-500 mt-1">{splitSeedText(payTitle.description).text}</div>
              {splitSeedText(payTitle.description).seed ? (
                <div className="text-[11px] text-slate-400 mt-1 font-mono">SEED: {splitSeedText(payTitle.description).seed}</div>
              ) : null}
              <div className="text-xs text-slate-500 mt-2">
                {kind === "ar" ? "Recebimento" : "Pagamento"}
                {payTitle.partyName ? <> · {payTitle.partyName}</> : null}
              </div>
            </div>

            <div className="p-6 max-h-[calc(100vh-240px)] overflow-auto">
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700">
                    <div className="text-xs text-slate-500">Vencimento</div>
                    <div className="font-semibold text-slate-900 mt-1">{payTitle.dueDate}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700">
                    <div className="text-xs text-slate-500">Valor</div>
                    <div className="font-semibold text-slate-900 mt-1">{formatCurrency(payTitle.amount)}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700">
                    <div className="text-xs text-slate-500">Pago</div>
                    <div className="font-semibold text-slate-900 mt-1">{formatCurrency(payTitle.paidAmount)}</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-sm text-slate-700 border border-blue-100">
                    <div className="text-xs text-blue-700">Em aberto</div>
                    <div className="font-bold text-blue-800 mt-1">{formatCurrency(Math.max(0, payTitle.amount - payTitle.paidAmount))}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</label>
                    <MoneyInput
                      className="mt-2 h-12"
                      value={payAmount}
                      onValueChange={setPayAmount}
                      placeholder="0,00"
                      withSymbol={false}
                      autoFocus
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPayAmount(Math.round(Math.max(0, payTitle.amount - payTitle.paidAmount) * 100) / 100)}
                        disabled={paying}
                      >
                        Baixar total
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Método</label>
                    <Select className="mt-2 h-12" value={payMethod} onChange={(e) => setPayMethod(e.target.value as FinancialPaymentMethod)}>
                      <option value="money">Dinheiro</option>
                      <option value="pix">PIX</option>
                      <option value="credit">Crédito</option>
                      <option value="debit">Débito</option>
                      <option value="boleto">Boleto</option>
                      <option value="crediario">Crediário</option>
                      <option value="other">Outro</option>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Destino</label>
                    <Select className="mt-2 h-12" value={paySettlement} onChange={(e) => setPaySettlement(e.target.value as any)}>
                      <option value="cash" disabled={!payCashSessionId}>
                        Caixa (sessão aberta)
                      </option>
                      <option value="bank" disabled={bankAccounts.length === 0}>
                        Banco
                      </option>
                      <option value="none">Sem lançamento</option>
                    </Select>
                    {!payCashSessionId && paySettlement === "cash" ? (
                      <div className="mt-2 text-xs text-slate-500">Abra um caixa para lançar em caixa.</div>
                    ) : null}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conta bancária</label>
                    <Select
                      className="mt-2 h-12"
                      value={payBankAccountId}
                      onChange={(e) => setPayBankAccountId(e.target.value)}
                      disabled={paySettlement !== "bank"}
                    >
                      <option value="">Selecione</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Observação (opcional)</label>
                  <Input className="mt-2 h-12" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Ex.: Recebido via PIX do cliente" />
                  <div className="mt-2 text-xs text-slate-500">
                    A baixa é feita em uma única operação, com vínculo opcional ao Caixa/Banco.
                  </div>
                </div>

                {payError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{payError}</div> : null}
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
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="text-lg font-bold text-slate-900">Novo título</div>
              <div className="text-sm text-slate-500 mt-1">
                {kind === "ar" ? "Conta a receber" : "Conta a pagar"} · Lançamento manual
              </div>
            </div>

            <div className="p-6 max-h-[calc(100vh-240px)] overflow-auto">
              <div className="space-y-5">
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
                    <MoneyInput
                      className="mt-2 h-12"
                      value={newAmount}
                      onValueChange={setNewAmount}
                      placeholder="0,00"
                      withSymbol={false}
                    />
                    <div className="mt-2 text-xs text-slate-500">Use ponto ou vírgula. Ex.: 219,88</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencimento</label>
                    <Input type="date" className="mt-2 h-12" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Competência</label>
                    <Input
                      type="date"
                      className="mt-2 h-12"
                      value={newCompetenceDate}
                      onChange={(e) => setNewCompetenceDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Documento (opcional)</label>
                    <Input className="mt-2 h-12" value={newDocumentNumber} onChange={(e) => setNewDocumentNumber(e.target.value)} placeholder="Ex.: NF 123" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoria</label>
                    <Select className="mt-2 h-12" value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)}>
                      <option value="">Selecione</option>
                      {finCategories
                        .filter((c) => c.active)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Centro de custo</label>
                    <Select className="mt-2 h-12" value={newCostCenterId} onChange={(e) => setNewCostCenterId(e.target.value)}>
                      <option value="">Opcional</option>
                      {finCostCenters
                        .filter((c) => c.active)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conta (plano)</label>
                    <Select className="mt-2 h-12" value={newCoaAccountId} onChange={(e) => setNewCoaAccountId(e.target.value)}>
                      <option value="">Selecione</option>
                      {coaAccounts
                        .filter((a) => a.active)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                    </Select>
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
