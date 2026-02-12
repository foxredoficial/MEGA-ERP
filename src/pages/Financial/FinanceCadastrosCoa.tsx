import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { createCoaAccount, updateCoaAccount, type CoaNature, type FinCoaAccount } from "@/lib/api_finance";

function CoaEditor(props: {
  open: boolean;
  onClose: () => void;
  value: FinCoaAccount | null;
  parents: FinCoaAccount[];
  onSave: (next: { code: string; name: string; nature: CoaNature; parentId?: string | null; active: boolean }) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [nature, setNature] = useState<CoaNature>("revenue");
  const [parentId, setParentId] = useState<string>("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCode(props.value?.code ?? "");
    setName(props.value?.name ?? "");
    setNature(props.value?.nature ?? "revenue");
    setParentId(props.value?.parentId ?? "");
    setActive(props.value?.active ?? true);
  }, [props.value, props.open]);

  return (
    <Modal isOpen={props.open} onClose={props.onClose} title={props.value ? "Editar conta" : "Nova conta"}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Código</label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex.: 3.01.01" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Natureza</label>
            <Select value={nature} onChange={(e) => setNature(e.target.value as CoaNature)}>
              <option value="revenue">Receita</option>
              <option value="expense">Despesa</option>
              <option value="asset">Ativo</option>
              <option value="liability">Passivo</option>
              <option value="equity">Patrimônio</option>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Receita de Vendas" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conta pai (opcional)</label>
          <Select value={parentId || ""} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Sem conta pai</option>
            {props.parents
              .filter((p) => (props.value ? p.id !== props.value.id : true))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
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
              if (!code.trim() || !name.trim()) return;
              setBusy(true);
              try {
                await props.onSave({
                  code: code.trim(),
                  name: name.trim(),
                  nature,
                  parentId: parentId || null,
                  active,
                });
                props.onClose();
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy || !code.trim() || !name.trim()}
          >
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function FinanceCadastrosCoa(props: { items: FinCoaAccount[]; loading: boolean; onChanged: () => Promise<void> }) {
  const [edit, setEdit] = useState<FinCoaAccount | null>(null);
  const [open, setOpen] = useState(false);
  const parents = useMemo(() => props.items.filter((a) => a.active), [props.items]);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">Plano de contas</div>
          <Button
            className="bg-slate-900 hover:bg-slate-800 text-white"
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            Nova conta
          </Button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm text-left min-w-[920px]">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Natureza</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {props.items.map((a) => (
                <tr key={a.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{a.code}</td>
                  <td className="px-6 py-4 text-slate-900 font-medium">{a.name}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {a.nature === "revenue"
                      ? "Receita"
                      : a.nature === "expense"
                        ? "Despesa"
                        : a.nature === "asset"
                          ? "Ativo"
                          : a.nature === "liability"
                            ? "Passivo"
                            : "Patrimônio"}
                  </td>
                  <td className="px-6 py-4">
                    <Badge tone={a.active ? "green" : "slate"}>{a.active ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEdit(a);
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
                  <td className="px-6 py-12 text-center text-slate-500" colSpan={5}>
                    Nenhuma conta cadastrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <CoaEditor
        open={open}
        value={edit}
        parents={parents}
        onClose={() => setOpen(false)}
        onSave={async (next) => {
          if (edit) await updateCoaAccount(edit.id, next);
          else await createCoaAccount({ code: next.code, name: next.name, nature: next.nature, parentId: next.parentId });
          await props.onChanged();
        }}
      />
    </>
  );
}
