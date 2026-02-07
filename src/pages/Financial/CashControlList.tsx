import { useState, useEffect } from "react";
import { 
  DollarSign, 
  Calendar, 
  User, 
  Clock, 
  Search,
  Eye,
  Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getCashSessions, getCurrentOpenSession, type CashSession } from "@/lib/api_cash";
import { formatCurrency } from "@/lib/utils";

export function CashControlList() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [allSessions, openSession] = await Promise.all([
        getCashSessions(),
        getCurrentOpenSession()
      ]);
      setSessions(allSessions);
      setCurrentSession(openSession);
    } catch (error) {
      console.error("Erro ao carregar caixas:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <BlingLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Controle de Caixa</h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie aberturas, fechamentos e movimentações financeiras.</p>
          </div>
          <div className="flex items-center gap-3">
            {currentSession ? (
              <Button 
                onClick={() => navigate(`/app/financeiro/caixa/${currentSession.id}`)}
                className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200 gap-2 animate-pulse"
              >
                <Lock className="w-4 h-4" />
                Caixa Aberto (Acessar)
              </Button>
            ) : (
              <Button 
                onClick={() => navigate("/app/pdv")} // Redirect to PDV to open cash
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Abrir Novo Caixa
              </Button>
            )}
          </div>
        </div>

        {/* Current Session Card (if exists) */}
        {currentSession && (
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <DollarSign className="w-32 h-32 text-green-600" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Sessão Atual em Aberto
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-sm text-slate-500 mb-1">Operador</div>
                  <div className="font-medium text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    {currentSession.userName || 'Usuário Atual'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Abertura</div>
                  <div className="font-medium text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {new Date(currentSession.openedAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Saldo Inicial</div>
                  <div className="font-medium text-slate-900">
                    {formatCurrency(currentSession.openingBalance)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Saldo Atual (Estimado)</div>
                  <div className="font-bold text-xl text-blue-600">
                    {formatCurrency(currentSession.currentBalance)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-500" />
              Histórico de Caixas
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Buscar por data ou operador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-auto max-h-[calc(100vh-360px)]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Data/Hora Abertura</th>
                  <th className="px-6 py-4">Data/Hora Fechamento</th>
                  <th className="px-6 py-4">Operador</th>
                  <th className="px-6 py-4 text-right">Saldo Inicial</th>
                  <th className="px-6 py-4 text-right">Entradas</th>
                  <th className="px-6 py-4 text-right">Saídas</th>
                  <th className="px-6 py-4 text-right">Saldo Final</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions
                  .filter((s) => {
                    const q = search.trim().toLowerCase();
                    if (!q) return true;
                    const opened = new Date(s.openedAt).toLocaleString().toLowerCase();
                    const closed = s.closedAt ? new Date(s.closedAt).toLocaleString().toLowerCase() : "";
                    const userName = (s.userName || "").toLowerCase();
                    const status = (s.status || "").toLowerCase();
                    return opened.includes(q) || closed.includes(q) || userName.includes(q) || status.includes(q);
                  })
                  .map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(session.openedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {session.closedAt ? new Date(session.closedAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {session.userName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {formatCurrency(session.openingBalance)}
                    </td>
                    <td className="px-6 py-4 text-right text-green-600 font-medium">
                      +{formatCurrency(session.totalIn)}
                    </td>
                    <td className="px-6 py-4 text-right text-red-600 font-medium">
                      -{formatCurrency(session.totalOut)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {formatCurrency(session.currentBalance)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge tone={session.status === "open" ? "green" : "slate"}>
                        {session.status === "open" ? "ABERTO" : "FECHADO"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/app/financeiro/caixa/${session.id}`)}
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                      Nenhum registro de caixa encontrado.
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
