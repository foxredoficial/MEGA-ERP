import { BlingLayout } from "@/components/BlingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Link } from "react-router-dom";
import { Bell, HelpCircle, Settings } from "lucide-react";

export function AppLauncher() {
  return (
    <BlingLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Atalhos</h1>
          <p className="text-sm text-slate-500 mt-1">Acesso rápido às principais áreas.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to={{ pathname: "/app", hash: "#settings" }}>
            <Card className="hover:border-blue-300 hover:shadow-sm transition">
              <CardHeader className="flex flex-row items-center gap-3">
                <Settings className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-base">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">Empresa, perfil, segurança, preferências e fiscal.</CardContent>
            </Card>
          </Link>

          <Link to="/app/notificacoes">
            <Card className="hover:border-blue-300 hover:shadow-sm transition">
              <CardHeader className="flex flex-row items-center gap-3">
                <Bell className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-base">Notificações</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">Alertas do sistema e eventos importantes.</CardContent>
            </Card>
          </Link>

          <Link to="/app/ajuda">
            <Card className="hover:border-blue-300 hover:shadow-sm transition">
              <CardHeader className="flex flex-row items-center gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-base">Ajuda</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">FAQ, atalhos e suporte.</CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </BlingLayout>
  );
}

