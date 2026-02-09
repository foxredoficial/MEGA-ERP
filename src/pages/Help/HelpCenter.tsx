import { BlingLayout } from "@/components/BlingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function HelpCenter() {
  return (
    <BlingLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ajuda</h1>
          <p className="text-sm text-slate-500 mt-1">Dúvidas frequentes e orientação rápida.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Como emitir NFe/NFC-e?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Vá em Configurações &gt; Fiscal (NFe) e configure o provedor. Depois acesse Vendas &gt; Notas fiscais de saída (NFe) ou NFC-e.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conciliação e bancos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Cadastre contas em Financeiro &gt; Caixas e bancos e registre entradas/saídas para acompanhar o saldo e extrato.
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to={{ pathname: "/app", hash: "#settings" }}>
            <Button variant="secondary">Abrir configurações</Button>
          </Link>
          <Link to="/app/vendas/pedidos">
            <Button variant="secondary">Pedidos de venda</Button>
          </Link>
          <Link to="/app/docs/nfe">
            <Button variant="secondary">Notas fiscais (NFe)</Button>
          </Link>
          <Link to="/app/financeiro/bancos">
            <Button variant="secondary">Caixas e bancos</Button>
          </Link>
        </div>
      </div>
    </BlingLayout>
  );
}
