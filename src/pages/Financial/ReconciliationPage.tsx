import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/utils";
import { importBankStatement, listBankAccounts, listBankTransactions, type BankAccount, type BankTransaction } from "@/lib/api_banks";
import { listFinancialTitles, settleTitle, type FinancialTitle } from "@/lib/api_financial_titles";
import { parseCsvBankStatement, parseOfxBankStatement } from "@/lib/bankStatement";
import { BlingLayout } from "@/components/BlingLayout";

type ImportFormat = "csv" | "ofx";

function txLabel(t: BankTransaction) {
  const d = new Date(t.occurredAt);
  const ymd = Number.isNaN(d.getTime()) ? t.occurredAt.slice(0, 10) : d.toISOString().slice(0, 10);
  const sign = t.type === "in" ? "+" : "-";
  return `${ymd} · ${sign}${formatCurrency(t.amount)} · ${t.description}`;
}

export default function ReconciliationPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [format, setFormat] = useState<ImportFormat>("ofx");
  const [fileName, setFileName] = useState<string>("");
  const [parsedCount, setParsedCount] = useState(0);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [unreconciled, setUnreconciled] = useState<BankTransaction[]>([]);
  const [selectedTxId, setSelectedTxId] = useState<string>("");
  const selectedTx = useMemo(() => unreconciled.find((t) => t.id === selectedTxId) ?? null, [unreconciled, selectedTxId]);

  const [titleQuery, setTitleQuery] = useState("");
  const [titles, setTitles] = useState<FinancialTitle[]>([]);
  const [selectedTitleId, setSelectedTitleId] = useState<string>("");
  const selectedTitle = useMemo(() => titles.find((t) => t.id === selectedTitleId) ?? null, [titles, selectedTitleId]);
  const [settleBusy, setSettleBusy] = useState(false);

  async function loadAccounts() {
    const list = await listBankAccounts();
    setAccounts(list);
    if (!accountId && list[0]?.id) setAccountId(list[0].id);
  }

  async function loadUnreconciledTxs(nextAccountId: string) {
    const txs = await listBankTransactions(nextAccountId, { source: "import", unreconciled: true });
    setUnreconciled(txs);
    if (txs[0]?.id) setSelectedTxId(txs[0].id);
  }

  async function loadTitlesForTx(tx: BankTransaction | null) {
    if (!tx) {
      setTitles([]);
      setSelectedTitleId("");
      return;
    }
    const kind = tx.type === "in" ? "ar" : "ap";
    const list = await listFinancialTitles({ kind });
    const open = list.filter((t) => t.status === "open" || t.status === "partial");
    setTitles(open);
    setSelectedTitleId("");
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    loadAccounts()
      .catch((e: any) => setError(e?.message ?? "Falha ao carregar contas."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    loadUnreconciledTxs(accountId)
      .then(() => loadTitlesForTx(null))
      .catch((e: any) => setError(e?.message ?? "Falha ao carregar extrato."))
      .finally(() => setLoading(false));
  }, [accountId]);

  useEffect(() => {
    loadTitlesForTx(selectedTx).catch(() => {
      setTitles([]);
    });
  }, [selectedTxId]);

  const filteredTitles = useMemo(() => {
    const q = titleQuery.trim().toLowerCase();
    if (!q) return titles;
    return titles.filter((t) => `${t.description} ${t.partyName ?? ""}`.toLowerCase().includes(q));
  }, [titles, titleQuery]);

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Conciliação bancária</h1>
            <p className="text-sm text-slate-500 mt-1">Importe o extrato (CSV/OFX) e vincule aos títulos.</p>
          </div>
        </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conta bancária</label>
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Formato</label>
              <Select value={format} onChange={(e) => setFormat(e.target.value as ImportFormat)}>
                <option value="ofx">OFX</option>
                <option value="csv">CSV</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Arquivo</label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={format === "ofx" ? ".ofx,text/*" : ".csv,text/*"}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setFileName(file.name);
                  setImportResult(null);
                  setParsedCount(0);
                  setError(null);
                  try {
                    const text = await file.text();
                    const parsed = format === "ofx" ? parseOfxBankStatement(text) : parseCsvBankStatement(text);
                    setParsedCount(parsed.length);
                    const importBatchId = crypto.randomUUID();
                    const res = await importBankStatement(accountId, { importBatchId, lines: parsed });
                    setImportResult(res);
                    await loadUnreconciledTxs(accountId);
                  } catch (err: any) {
                    setError(err?.message ?? "Falha ao importar extrato.");
                  } finally {
                    e.target.value = "";
                  }
                }}
              />

              <div className="h-11 rounded-xl border border-slate-200 bg-white px-3 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!accountId}
                >
                  Escolher arquivo
                </Button>
                <div className="text-sm text-slate-600 truncate flex-1">
                  {fileName ? <span className="font-medium">{fileName}</span> : <span className="text-slate-400">Nenhum arquivo escolhido</span>}
                </div>
              </div>
            </div>
          </div>

          {fileName ? (
            <div className="mt-4 text-sm text-slate-600">
              Arquivo: <span className="font-medium">{fileName}</span> · Linhas lidas: <span className="font-medium">{parsedCount}</span>
              {importResult ? (
                <span>
                  {" "}· Inseridas: <span className="font-medium">{importResult.inserted}</span> · Duplicadas ignoradas: <span className="font-medium">{importResult.skipped}</span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">Extrato importado (pendente)</div>
              <Button
                variant="secondary"
                onClick={async () => {
                  if (!accountId) return;
                  setLoading(true);
                  try {
                    await loadUnreconciledTxs(accountId);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                Atualizar
              </Button>
            </div>

            <div className="overflow-auto max-h-[520px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100 sticky top-0 z-20">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {unreconciled.map((t) => {
                    const d = new Date(t.occurredAt);
                    const ymd = Number.isNaN(d.getTime()) ? t.occurredAt.slice(0, 10) : d.toISOString().slice(0, 10);
                    const signed = t.type === "in" ? Number(t.amount) : -Number(t.amount);
                    return (
                      <tr
                        key={t.id}
                        className={
                          t.id === selectedTxId
                            ? "bg-blue-50/60 cursor-pointer"
                            : "hover:bg-blue-50/30 transition-colors cursor-pointer"
                        }
                        onClick={() => setSelectedTxId(t.id)}
                      >
                        <td className="px-6 py-4 text-slate-600">{ymd}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900 truncate">{t.description}</div>
                          <div className="text-xs text-slate-500 truncate">{t.type === "in" ? "Entrada" : "Saída"}</div>
                        </td>
                        <td className={"px-6 py-4 text-right font-medium " + (signed >= 0 ? "text-emerald-700" : "text-red-700")}>
                          {signed >= 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(signed))}
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && unreconciled.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                        Sem linhas pendentes.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="text-sm font-semibold text-slate-900">Vincular a título</div>
            {!selectedTx ? (
              <div className="mt-4 text-sm text-slate-500">Selecione uma linha do extrato para sugerir títulos.</div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 border border-slate-100">
                  <div className="text-xs text-slate-500">Linha selecionada</div>
                  <div className="mt-1 font-medium">{txLabel(selectedTx)}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Buscar</label>
                    <Search className="absolute left-3 top-[39px] w-4 h-4 text-slate-400" />
                    <Input
                      className="pl-10"
                      value={titleQuery}
                      onChange={(e) => setTitleQuery(e.target.value)}
                      placeholder="Cliente/fornecedor ou descrição"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Título</label>
                    <Select value={selectedTitleId} onChange={(e) => setSelectedTitleId(e.target.value)}>
                      <option value="">Selecione</option>
                      {filteredTitles.slice(0, 200).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.dueDate} · {formatCurrency(Math.max(0, t.amount - t.paidAmount))} · {t.partyName ?? ""} {t.description}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-sm text-slate-600">
                    {selectedTitle ? (
                      <span>
                        Em aberto: <span className="font-medium">{formatCurrency(Math.max(0, selectedTitle.amount - selectedTitle.paidAmount))}</span>
                      </span>
                    ) : (
                      <span>Escolha um título para conciliar.</span>
                    )}
                  </div>
                  <Button
                    onClick={async () => {
                      if (!selectedTx || !selectedTitle) return;
                      setSettleBusy(true);
                      setError(null);
                      try {
                        await settleTitle({
                          titleId: selectedTitle.id,
                          amount: Math.min(selectedTx.amount, Math.max(0, selectedTitle.amount - selectedTitle.paidAmount)),
                          method: "other",
                          paidAt: selectedTx.occurredAt,
                          notes: `Conciliação: ${selectedTx.description}`,
                          settlement: { type: "bank", bankTransactionId: selectedTx.id },
                        });
                        await loadUnreconciledTxs(accountId);
                        setSelectedTitleId("");
                      } catch (err: any) {
                        setError(err?.message ?? "Falha ao conciliar.");
                      } finally {
                        setSettleBusy(false);
                      }
                    }}
                    disabled={settleBusy || !selectedTx || !selectedTitle}
                  >
                    Dar baixa e conciliar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </BlingLayout>
  );
}
