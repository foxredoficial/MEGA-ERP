import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, History, PackagePlus, X } from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { ProductSearch } from "@/components/ProductSearch";
import { addStockMovement, getStockHistory, type StockMovement, type StockMovementType } from "@/lib/api_products";
import { Pagination } from "@/components/ui/Pagination";
import { emitAppEvent } from "@/lib/appEvents";
import { cn, splitSeedText } from "@/lib/utils";

function toneForType(t: StockMovementType) {
  if (t === "in") return "green";
  if (t === "out") return "red";
  return "slate";
}

export function StockMovements() {
  const [productId, setProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<StockMovement[]>([]);

  const [type, setType] = useState<StockMovementType>("in");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  async function load() {
    if (!productId) {
      setHistory([]);
      return;
    }
    try {
      setLoading(true);
      const h = await getStockHistory(productId);
      setHistory(h);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [productId]);

  useEffect(() => {
    setPage(1);
  }, [productId]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 4500);
    return () => window.clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    if (!lastCreatedId) return;
    const t = window.setTimeout(() => setLastCreatedId(null), 8000);
    return () => window.clearTimeout(t);
  }, [lastCreatedId]);

  const total = history.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedHistory = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return history.slice(start, end);
  }, [history, page, pageSize, totalPages]);

  const title = useMemo(() => (productName ? `Lançamentos de estoque — ${productName}` : "Lançamentos de estoque"), [productName]);

  async function handleAdd() {
    if (!productId) return;
    try {
      setBusy(true);
      const id = await addStockMovement(productId, { type, quantity, reason: reason.trim() || undefined });
      setLastCreatedId(id);
      setReason("");
      await load();
      setFlash("Lançamento registrado com sucesso.");
      emitAppEvent("data:changed", { scope: "stock" });
    } catch (e) {
      alert((e as any)?.message ?? "Erro ao lançar estoque.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-sm text-slate-500 mt-1">Selecione um produto para ver o histórico e lançar entradas/saídas/ajustes.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Produto</label>
            <div className="mt-2">
              <ProductSearch
                onSelect={(p) => {
                  setProductId(p.id);
                  setProductName(p.name);
                }}
              />
            </div>
            {productId ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                  <span className="font-medium">Selecionado:</span>
                  <span className="text-slate-900">{productName || productId}</span>
                  <button
                    type="button"
                    className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-slate-200"
                    onClick={() => {
                      setProductId(null);
                      setProductName("");
                      setHistory([]);
                      setLastCreatedId(null);
                      setFlash(null);
                    }}
                    aria-label="Limpar produto"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</label>
              <Select className="mt-2" value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="in">Entrada</option>
                <option value="out">Saída</option>
                <option value="adjustment">Ajuste</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantidade</label>
              <Input className="mt-2" type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Motivo</label>
              <Input className="mt-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Ajuste inventário, perda, devolução..." />
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void handleAdd()} disabled={!productId || busy}>
              <PackagePlus className="w-4 h-4 mr-2" />
              {busy ? "Lançando..." : "Lançar"}
            </Button>
          </div>
        </div>

        {flash ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {flash}
          </div>
        ) : null}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 font-semibold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Histórico
          </div>
          <div className="overflow-auto max-h-[420px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Motivo</th>
                  <th className="px-6 py-3 text-right">Quantidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pagedHistory.map((m) => {
                  const info = splitSeedText(m.reason);
                  const highlight = lastCreatedId && m.id === lastCreatedId;
                  return (
                  <tr key={m.id} className={cn("hover:bg-blue-50/30 transition-colors", highlight && "bg-green-50")}> 
                    <td className="px-6 py-3 text-slate-600">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="px-6 py-3">
                      <Badge tone={toneForType(m.type) as any}>{m.type}</Badge>
                    </td>
                    <td className="px-6 py-3 text-slate-700">
                      <div className="text-slate-900">{info.text || "-"}</div>
                      {info.seed ? <div className="mt-0.5 text-[11px] text-slate-400 font-mono">SEED: {info.seed}</div> : null}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-slate-900">{m.quantity}</td>
                  </tr>
                )})}
                {!loading && !productId && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                      Selecione um produto para ver o histórico.
                    </td>
                  </tr>
                )}
                {!loading && productId && history.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                      Nenhum lançamento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
          <Pagination
            label="Movimentações"
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
    </BlingLayout>
  );
}
