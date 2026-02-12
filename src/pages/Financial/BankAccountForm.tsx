import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { addBankTransaction, createBankAccount, deleteBankAccount, getBankAccount, listBankTransactions, updateBankAccount, type BankTransaction } from "@/lib/api_banks";
import { formatCurrency } from "@/lib/utils";
import { Pagination } from "@/components/ui/Pagination";

export function BankAccountForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === "novo";
  const accountId = !isNew && id ? id : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [agency, setAgency] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);

  const [transactions, setTransactions] = useState<BankTransaction[]>([]);

  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(25);
  const [txType, setTxType] = useState<"in" | "out">("in");
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [txBusy, setTxBusy] = useState(false);

  useEffect(() => {
    setTxPage(1);
  }, [accountId]);

  const txTotal = transactions.length;
  const txTotalPages = Math.max(1, Math.ceil(txTotal / Math.max(1, txPageSize)));

  useEffect(() => {
    if (txPage > txTotalPages) setTxPage(txTotalPages);
  }, [txPage, txTotalPages]);

  const pagedTransactions = useMemo(() => {
    const safePage = Math.min(Math.max(1, txPage), txTotalPages);
    const start = (safePage - 1) * txPageSize;
    const end = start + txPageSize;
    return transactions.slice(start, end);
  }, [transactions, txPage, txPageSize, txTotalPages]);

  async function load() {
    if (!accountId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const acc = await getBankAccount(accountId);
      setName(acc.name);
      setBank(acc.bank ?? "");
      setAgency(acc.agency ?? "");
      setAccountNumber(acc.accountNumber ?? "");
      setInitialBalance(acc.initialBalance);
      setBalance(acc.balance);
      const txs = await listBankTransactions(accountId);
      setTransactions(txs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [accountId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      if (accountId) {
        await updateBankAccount(accountId, { name, bank: bank || null, agency: agency || null, accountNumber: accountNumber || null });
        await load();
        return;
      }
      const created = await createBankAccount({ name, bank: bank || null, agency: agency || null, accountNumber: accountNumber || null, initialBalance: initialBalance || 0 });
      navigate(`/app/financeiro/bancos/${created.id}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!accountId) return;
    try {
      setDeleting(true);
      await deleteBankAccount(accountId);
      navigate("/app/financeiro/bancos");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleAddTx() {
    if (!accountId) return;
    if (!txDescription.trim() || txAmount <= 0) return;
    try {
      setTxBusy(true);
      await addBankTransaction(accountId, {
        type: txType,
        amount: Math.round(txAmount * 100) / 100,
        description: txDescription,
        occurredAt: new Date(txDate).toISOString(),
      });
      setTxAmount(0);
      setTxDescription("");
      await load();
    } finally {
      setTxBusy(false);
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
            <Link to="/app/financeiro/bancos" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{accountId ? "Editar Conta" : "Nova Conta"}</h1>
              {accountId && <p className="text-sm text-slate-500 mt-1">Saldo atual: {formatCurrency(balance)}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {accountId && (
              <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmDelete(true)} disabled={deleting}>
                Excluir
              </Button>
            )}
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</label>
                <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Banco Principal" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Banco</label>
                <Input className="mt-2" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Ex: Itaú" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Agência</label>
                <Input className="mt-2" value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="0001" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conta</label>
                <Input className="mt-2" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="12345-6" />
              </div>
            </div>

            {isNew && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Inicial</label>
                <MoneyInput className="mt-2" value={initialBalance} onValueChange={setInitialBalance} withSymbol={false} />
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="text-sm font-semibold text-slate-900">Movimentação</div>
            {!accountId ? (
              <div className="text-sm text-slate-500">Salve a conta para lançar movimentações.</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Select className="h-11" value={txType} onChange={(e) => setTxType(e.target.value as any)}>
                    <option value="in">Entrada</option>
                    <option value="out">Saída</option>
                  </Select>
                  <MoneyInput value={txAmount} onValueChange={setTxAmount} withSymbol={false} placeholder="0,00" />
                </div>
                <Input value={txDescription} onChange={(e) => setTxDescription(e.target.value)} placeholder="Descrição" />
                <Input type="datetime-local" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
                <Button type="button" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void handleAddTx()} disabled={txBusy}>
                  <Plus className="w-4 h-4 mr-2" />
                  {txBusy ? "Lançando..." : "Adicionar"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {accountId && (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 font-semibold text-slate-900">Extrato</div>
              <div className="overflow-auto max-h-[420px]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3">Data</th>
                      <th className="px-6 py-3">Descrição</th>
                      <th className="px-6 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pagedTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-3 text-slate-600">{new Date(t.occurredAt).toLocaleString()}</td>
                        <td className="px-6 py-3 text-slate-900">{t.description}</td>
                        <td className={`px-6 py-3 text-right font-medium ${t.type === "in" ? "text-green-600" : "text-red-600"}`}>
                          {t.type === "in" ? "+" : "-"}
                          {formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-10 text-center text-slate-500">
                          Nenhuma movimentação.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 mt-4">
              <Pagination
                label="Movimentações"
                page={txPage}
                pageSize={txPageSize}
                total={txTotal}
                onPageChange={setTxPage}
                onPageSizeChange={(n) => {
                  setTxPageSize(n);
                  setTxPage(1);
                }}
              />
            </div>
          </>
        )}
      </form>

      <ConfirmationDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
        title="Excluir conta"
        description="Deseja excluir esta conta bancária? Movimentações serão removidas."
        confirmText="Excluir"
        variant="danger"
        loading={deleting}
      />
    </BlingLayout>
  );
}
