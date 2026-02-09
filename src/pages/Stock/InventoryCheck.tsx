import { useMemo, useState } from "react";
import { ClipboardCheck, ArrowRightLeft } from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProductSearch } from "@/components/ProductSearch";
import { addStockMovement, type StockMovementType } from "@/lib/api_products";

export function InventoryCheck() {
  const [productId, setProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>("");
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [countedStock, setCountedStock] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  const diff = useMemo(() => {
    if (currentStock === null) return 0;
    return countedStock - currentStock;
  }, [countedStock, currentStock]);

  async function applyAdjustment() {
    if (!productId || currentStock === null) return;
    const quantity = Math.abs(diff);
    if (quantity <= 0) return;
    const type: StockMovementType = diff > 0 ? "in" : "out";
    try {
      setBusy(true);
      await addStockMovement(productId, {
        type,
        quantity,
        reason: "Ajuste por conferência de estoque",
      });
      setCurrentStock(countedStock);
    } catch (e) {
      alert((e as any)?.message ?? "Falha ao aplicar ajuste.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Conferência de estoque</h1>
          <p className="text-sm text-slate-500 mt-1">Selecione um produto, informe a contagem e aplique o ajuste automaticamente.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Produto</label>
            <div className="mt-2">
              <ProductSearch
                onSelect={(p: any) => {
                  setProductId(p.id);
                  setProductName(p.name);
                  const s = Number(p.stock ?? 0);
                  setCurrentStock(s);
                  setCountedStock(s);
                }}
              />
            </div>
            {productName && <div className="mt-2 text-sm text-slate-700">Selecionado: {productName}</div>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estoque atual</label>
              <Input className="mt-2" value={currentStock ?? "-"} disabled />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contagem</label>
              <Input className="mt-2" type="number" step="0.001" value={countedStock} onChange={(e) => setCountedStock(Number(e.target.value))} disabled={!productId} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Diferença</label>
              <Input className="mt-2" value={productId ? diff : "-"} disabled />
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void applyAdjustment()} disabled={!productId || busy || diff === 0}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              {busy ? "Aplicando..." : "Aplicar ajuste"}
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 flex items-start gap-2">
            <ClipboardCheck className="w-4 h-4 mt-0.5 text-slate-500" />
            <span>O ajuste gera um lançamento de estoque (entrada/saída) e mantém histórico.</span>
          </div>
        </div>
      </div>
    </BlingLayout>
  );
}
