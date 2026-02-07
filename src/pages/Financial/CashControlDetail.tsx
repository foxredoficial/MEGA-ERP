import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Printer,
  Lock,
  Plus,
  Minus
} from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { 
  getSessionDetails, 
  closeCashSession, 
  addTransaction,
  type CashSession,
} from "@/lib/api_cash";
import { formatCurrency } from "@/lib/utils";

export function CashControlDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [closingNotes, setClosingNotes] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);
  
  // Transaction Modal State
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'supply' | 'bleed'>('supply');
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDesc, setTransactionDesc] = useState("");

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      setLoading(true);
      const data = await getSessionDetails(sessionId);
      if (data) setSession(data);
      else navigate("/app/financeiro/caixa");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);


  useEffect(() => {
    if (id) void loadSession(id);
  }, [id, loadSession]);

  async function handleCloseSession() {
    if (!session) return;
    try {
      setClosing(true);
      // In a real scenario, we might ask for the counted amount to compare
      await closeCashSession(session.id, session.currentBalance, closingNotes);
      await loadSession(session.id);
      setShowCloseModal(false);
    } catch {
      alert("Erro ao fechar caixa");
    } finally {
      setClosing(false);
    }
  }

  async function handleAddTransaction() {
    if (!session || !transactionAmount) return;
    try {
      await addTransaction(
        session.id,
        transactionType === 'supply' ? 'in' : 'out',
        transactionType,
        Number(transactionAmount),
        transactionDesc || (transactionType === 'supply' ? 'Suprimento Manual' : 'Sangria Manual'),
        'money'
      );
      await loadSession(session.id);
      setShowTransactionModal(false);
      setTransactionAmount("");
      setTransactionDesc("");
    } catch {
      alert("Erro ao adicionar movimentação");
    }
  }

  if (loading || !session) return null;

  return (
    <BlingLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app/financeiro/caixa")}>
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                Detalhes do Caixa
                <Badge tone={session.status === 'open' ? 'green' : 'slate'}>
                  {session.status === 'open' ? 'ABERTO' : 'FECHADO'}
                </Badge>
              </h1>
              <p className="text-sm text-slate-500">
                {new Date(session.openedAt).toLocaleString()} • Operador: {session.userName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {session.status === 'open' && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setTransactionType('supply');
                    setShowTransactionModal(true);
                  }}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Suprimento
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setTransactionType('bleed');
                    setShowTransactionModal(true);
                  }}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Sangria
                </Button>
                <Button 
                  onClick={() => setShowCloseModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Fechar Caixa
                </Button>
              </>
            )}
            <Button variant="ghost">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-sm text-slate-500 mb-1">Saldo Inicial</div>
            <div className="text-xl font-semibold text-slate-900">{formatCurrency(session.openingBalance)}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-sm text-slate-500 mb-1">Entradas</div>
            <div className="text-xl font-semibold text-green-600 flex items-center gap-1">
              <ArrowUpCircle className="w-4 h-4" />
              {formatCurrency(session.totalIn)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-sm text-slate-500 mb-1">Saídas</div>
            <div className="text-xl font-semibold text-red-600 flex items-center gap-1">
              <ArrowDownCircle className="w-4 h-4" />
              {formatCurrency(session.totalOut)}
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
            <div className="text-sm text-blue-600 mb-1 font-medium">Saldo Final (Calculado)</div>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(session.currentBalance)}</div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 font-semibold text-slate-900">
            Movimentações
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">Horário</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Forma Pagto.</th>
                <th className="px-6 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {session.transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-600">
                    {new Date(t.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      t.category === 'sale' ? 'bg-green-100 text-green-700' :
                      t.category === 'receipt' ? 'bg-blue-100 text-blue-700' :
                      t.category === 'payment' ? 'bg-red-50 text-red-600 border border-red-200' :
                      t.category === 'opening' ? 'bg-blue-100 text-blue-700' :
                      t.category === 'closing' ? 'bg-slate-100 text-slate-700' :
                      t.category === 'supply' ? 'bg-green-50 text-green-600 border border-green-200' :
                      'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {t.category === 'sale' ? 'Venda' :
                       t.category === 'receipt' ? 'Recebimento' :
                       t.category === 'payment' ? 'Pagamento' :
                       t.category === 'opening' ? 'Abertura' :
                       t.category === 'closing' ? 'Fechamento' :
                       t.category === 'supply' ? 'Suprimento' :
                       t.category === 'bleed' ? 'Sangria' : 'Despesa'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-900">{t.description}</td>
                  <td className="px-6 py-3 text-slate-600 capitalize">{t.paymentMethod}</td>
                  <td className={`px-6 py-3 text-right font-medium ${
                    t.type === 'in' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {t.type === 'in' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Close Session Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Fechar Caixa</h3>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="space-y-4 max-w-3xl">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="text-sm text-slate-500">Saldo Atual do Sistema</div>
                  <div className="text-2xl font-bold text-slate-900">{formatCurrency(session.currentBalance)}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observações do Fechamento</label>
                  <textarea 
                    className="w-full rounded-lg border-slate-200 text-sm focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
                    placeholder="Divergências, contagem de notas, etc..."
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowCloseModal(false)}>Cancelar</Button>
              <Button onClick={handleCloseSession} disabled={closing} className="bg-red-600 hover:bg-red-700 text-white">
                {closing ? "Fechando..." : "Confirmar Fechamento"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {transactionType === 'supply' ? (
                  <Plus className="w-5 h-5 text-green-600" />
                ) : (
                  <Minus className="w-5 h-5 text-red-600" />
                )}
                {transactionType === 'supply' ? 'Novo Suprimento' : 'Nova Sangria'}
              </h3>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="space-y-4 max-w-3xl">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0,00"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição / Motivo</label>
                  <Input 
                    placeholder={transactionType === 'supply' ? "Ex: Troco inicial adicional" : "Ex: Retirada para depósito"}
                    value={transactionDesc}
                    onChange={(e) => setTransactionDesc(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowTransactionModal(false)}>Cancelar</Button>
              <Button 
                onClick={handleAddTransaction} 
                className={transactionType === 'supply' ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </BlingLayout>
  );
}
