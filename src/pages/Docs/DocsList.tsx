import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { cancelDoc, listDocs, type BizDocument, type BizDocumentType } from "@/lib/api_docs";
import { formatCurrency } from "@/lib/utils";

const TYPE_LABEL: Record<BizDocumentType, string> = {
  proposal: "Propostas",
  contract: "Contratos",
  purchase_order: "Pedidos de Compra",
  incoming_invoice: "Notas de Entrada",
  production_order: "Ordens de Produção",
  nfe: "NFe",
  nfce: "NFC-e",
  service_invoice: "Notas de Serviço",
};

function statusTone(status: string) {
  if (status === "canceled") return "red";
  if (status === "issued") return "green";
  if (status === "draft" || status === "open") return "blue";
  return "slate";
}

export function DocsList() {
  const { type } = useParams();
  const docType = type as BizDocumentType;

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<BizDocument[]>([]);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  async function load() {
    if (!docType) return;
    try {
      setLoading(true);
      const data = await listDocs({ type: docType, query: search });
      setDocs(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [docType, search]);

  const title = TYPE_LABEL[docType] ?? "Documentos";

  const filtered = useMemo(() => docs, [docs]);

  async function confirmCancel() {
    if (!cancelId) return;
    try {
      setCanceling(true);
      await cancelDoc(cancelId);
      await load();
    } finally {
      setCanceling(false);
      setCancelId(null);
    }
  }

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie registros e acompanhe o histórico.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to={`/app/docs/${docType}/novo`}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2">
                <Plus className="w-4 h-4" />
                Novo
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por número ou nome..."
              className="pl-10 border-none shadow-none focus-visible:ring-0 bg-transparent h-12 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Número</th>
                  <th className="px-6 py-4">Cliente/Fornecedor</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-600 font-medium">{d.number}</td>
                    <td className="px-6 py-4 text-slate-900">{d.partyName ?? "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{d.date}</td>
                    <td className="px-6 py-4">
                      <Badge tone={statusTone(d.status) as any}>{d.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(d.totals.total)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/app/docs/${docType}/${d.id}`}>
                        <Button variant="outline" size="sm" className="border-slate-200">
                          Abrir
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={d.status === "canceled"}
                        onClick={() => setCancelId(d.id)}
                      >
                        Cancelar
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={Boolean(cancelId)}
        onClose={() => setCancelId(null)}
        onConfirm={() => void confirmCancel()}
        title="Cancelar documento"
        description="Deseja cancelar este documento?"
        confirmText="Cancelar"
        variant="danger"
        loading={canceling}
      />
    </BlingLayout>
  );
}

