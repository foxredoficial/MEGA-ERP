import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { createFinCategory, updateFinCategory, type FinCategory, type FinCategoryType } from "@/lib/api_finance";

function CategoryEditor(props: {
  open: boolean;
  onClose: () => void;
  value: FinCategory | null;
  onSave: (next: { name: string; type: FinCategoryType; active: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<FinCategoryType>("income");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(props.value?.name ?? "");
    setType(props.value?.type ?? "income");
    setActive(props.value?.active ?? true);
  }, [props.value, props.open]);

  return (
    <Modal isOpen={props.open} onClose={props.onClose} title={props.value ? "Editar categoria" : "Nova categoria"}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Vendas" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</label>
          <Select value={type} onChange={(e) => setType(e.target.value as FinCategoryType)}>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
            <option value="transfer">Transferência</option>
            <option value="other">Outro</option>
          </Select>
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
                await props.onSave({ name: name.trim(), type, active });
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

export function FinanceCadastrosCategories(props: { items: FinCategory[]; loading: boolean; onChanged: () => Promise<void> }) {
  const [edit, setEdit] = useState<FinCategory | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">Categorias</div>
          <Button
            className="bg-slate-900 hover:bg-slate-800 text-white"
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            Nova categoria
          </Button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm text-left min-w-[720px]">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {props.items.map((c) => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 text-slate-900 font-medium">{c.name}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {c.type === "income" ? "Receita" : c.type === "expense" ? "Despesa" : c.type === "transfer" ? "Transferência" : "Outro"}
                  </td>
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
                  <td className="px-6 py-12 text-center text-slate-500" colSpan={4}>
                    Nenhuma categoria cadastrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <CategoryEditor
        open={open}
        value={edit}
        onClose={() => setOpen(false)}
        onSave={async (next) => {
          if (edit) await updateFinCategory(edit.id, next);
          else await createFinCategory({ name: next.name, type: next.type });
          await props.onChanged();
        }}
      />
    </>
  );
}
