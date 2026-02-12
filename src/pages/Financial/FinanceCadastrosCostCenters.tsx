import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { createFinCostCenter, updateFinCostCenter, type FinCostCenter } from "@/lib/api_finance";

function CostCenterEditor(props: {
  open: boolean;
  onClose: () => void;
  value: FinCostCenter | null;
  onSave: (next: { name: string; active: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(props.value?.name ?? "");
    setActive(props.value?.active ?? true);
  }, [props.value, props.open]);

  return (
    <Modal isOpen={props.open} onClose={props.onClose} title={props.value ? "Editar centro de custo" : "Novo centro de custo"}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Loja Centro" />
        </div>
        {props.value ? (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativo
          </label>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={props.onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (!name.trim()) return;
              setBusy(true);
              try {
                await props.onSave({ name: name.trim(), active });
                props.onClose();
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy || !name.trim()}
          >
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function FinanceCadastrosCostCenters(props: { items: FinCostCenter[]; loading: boolean; onChanged: () => Promise<void> }) {
  const [edit, setEdit] = useState<FinCostCenter | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">Centros de custo</div>
          <Button
            className="bg-slate-900 hover:bg-slate-800 text-white"
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            Novo centro
          </Button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm text-left min-w-[720px]">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {props.items.map((c) => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 text-slate-900 font-medium">{c.name}</td>
                  <td className="px-6 py-4">
                    <Badge tone={c.active ? "green" : "slate"}>{c.active ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEdit(c);
                        setOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
              {!props.loading && props.items.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-500" colSpan={3}>
                    Nenhum centro de custo cadastrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <CostCenterEditor
        open={open}
        value={edit}
        onClose={() => setOpen(false)}
        onSave={async (next) => {
          if (edit) await updateFinCostCenter(edit.id, next);
          else await createFinCostCenter({ name: next.name });
          await props.onChanged();
        }}
      />
    </>
  );
}
