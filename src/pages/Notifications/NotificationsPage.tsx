import { BlingLayout } from "@/components/BlingLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function NotificationsPage() {
  return (
    <BlingLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notificações</h1>
          <p className="text-sm text-slate-500 mt-1">Central de alertas e eventos do sistema.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Em breve</CardTitle>
            <CardDescription>Este módulo já está roteado e pronto para evoluir.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Aqui vamos listar lembretes de vencimentos, status de emissão fiscal, falhas de conciliação e avisos de segurança.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações rápidas</CardTitle>
            <CardDescription>Atalhos úteis enquanto a central de notificações evolui.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link to="/app/financeiro/titulos?kind=ar">
              <Button variant="secondary">Contas a receber</Button>
            </Link>
            <Link to="/app/financeiro/titulos?kind=ap">
              <Button variant="secondary">Contas a pagar</Button>
            </Link>
            <Link to="/app/docs/nfe">
              <Button variant="secondary">Notas fiscais (NFe)</Button>
            </Link>
            <Link to="/app/financeiro/bancos">
              <Button variant="secondary">Caixas e bancos</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </BlingLayout>
  );
}
