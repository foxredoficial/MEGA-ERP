import { useEffect, useMemo, useState } from "react";
import { PackagePlus, History } from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ProductSearch } from "@/components/ProductSearch";
import { addStockMovement, getStockHistory, type StockMovement, type StockMovementType } from "@/lib/api_products";

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

  const title = useMemo(() => (productName ? `Lançamentos de estoque — ${productName}` : "Lançamentos de estoque"), [productName]);

  async function handleAdd() {
    if (!productId) return;
    try {
      setBusy(true);
      await addStockMovement(productId, { type, quantity, reason: reason.trim() || undefined });
      setReason("");
      await load();
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</label>
              <select className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="in">Entrada</option>
                <option value="out">Saída</option>
                <option value="adjustment">Ajuste</option>
              </select>
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
                {history.map((m) => (
                  <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-3 text-slate-600">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="px-6 py-3">
                      <Badge tone={toneForType(m.type) as any}>{m.type}</Badge>
                    </td>
                    <td className="px-6 py-3 text-slate-700">{m.reason ?? "-"}</td>
                    <td className="px-6 py-3 text-right font-medium text-slate-900">{m.quantity}</td>
                  </tr>
                ))}
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
      </div>
    </BlingLayout>
  );
}
