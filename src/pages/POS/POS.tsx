import { useEffect, useState } from "react";
import { 
  ShoppingCart, 
  User, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  QrCode, 
  FileText,
  Save,
  X,
  Maximize2,
  Minimize2,
  Lock
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ContactSearch } from "@/components/ContactSearch";
import { ProductSearch } from "@/components/ProductSearch";
import { formatCurrency, cn } from "@/lib/utils";
import { addStockMovement, getProduct, type Product } from "@/lib/api_products";
import { 
  getCurrentOpenSession, 
  openCashSession, 
  addTransaction, 
  type CashSession 
} from "@/lib/api_cash";
import { createPdvSale } from "@/lib/api_pdv_sales";
import { createFinancialTitle, registerPayment, resolveFinancialMethodFromPos } from "@/lib/api_financial_titles";
import { useAuthStore } from "@/stores/authStore";

// Types
interface CartItem {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  discount: number; // in currency
  total: number;
}

interface PaymentMethod {
  id: string;
  label: string;
  icon: LucideIcon;
  type: 'money' | 'credit' | 'debit' | 'pix' | 'boleto' | 'crediario';
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'money', label: 'Dinheiro', icon: Banknote, type: 'money' },
  { id: 'pix', label: 'PIX', icon: QrCode, type: 'pix' },
  { id: 'credit', label: 'Crédito', icon: CreditCard, type: 'credit' },
  { id: 'debit', label: 'Débito', icon: CreditCard, type: 'debit' },
  { id: 'boleto', label: 'Boleto', icon: FileText, type: 'boleto' },
  { id: 'crediario', label: 'Crediário', icon: User, type: 'crediario' },
];

export function POS() {
  const auth = useAuthStore();
  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string>('money');
  const [globalDiscount, setGlobalDiscount] = useState<{ type: 'percentage' | 'fixed'; value: number }>({ type: 'fixed', value: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOpenCashModal, setShowOpenCashModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("");
  const [processingSale, setProcessingSale] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  async function checkSession() {
    try {
      setLoading(true);
      const openSession = await getCurrentOpenSession();
      if (openSession) {
        setSession(openSession);
      } else {
        setShowOpenCashModal(true);
      }
    } catch (error) {
      console.error("Erro ao verificar caixa:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenSession() {
    try {
      if (!auth.session) {
        alert('Você precisa estar logado para abrir o caixa.');
        return;
      }
      const balance = parseFloat(openingBalance.replace(',', '.')) || 0;
      const newSession = await openCashSession(balance, auth.session.userId, auth.profile?.fullName ?? auth.session.email);
      setSession(newSession);
      setShowOpenCashModal(false);
    } catch (error) {
      alert("Erro ao abrir caixa: " + error);
    }
  }

  async function handleFinalizeSale() {
    if (!session) return;
    
    try {
      setProcessingSale(true);

      const saleId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const today = new Date().toISOString().slice(0, 10);

      const itemsForSale = cart.map((i) => ({
        id: crypto.randomUUID(),
        productId: i.productId,
        name: i.name,
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: i.price,
        discountPerUnit: i.discount,
        lineTotal: i.total,
      }));

      const products = await Promise.all(
        [...new Set(cart.map((i) => i.productId))].map((pid) => getProduct(pid))
      );
      const byId = new Map(products.map((p) => [p.id, p] as const));
      for (const item of cart) {
        const p = byId.get(item.productId);
        if (!p) throw new Error('Produto não encontrado.');
        if (p.has_lot_control) {
          throw new Error(`O produto "${p.name}" exige controle de lote. Selecione um lote para vender.`);
        }
        if (p.stock < item.quantity) {
          throw new Error(`Estoque insuficiente para: ${p.name}. Saldo atual: ${p.stock}`);
        }
      }

      for (const item of cart) {
        await addStockMovement(item.productId, {
          type: 'out',
          quantity: item.quantity,
          reason: `Venda PDV ${saleId}`,
        });
      }

      await createPdvSale(
        {
          cashSessionId: session.id,
          customerId: client?.id ?? null,
          customerName: client?.name ?? null,
          paymentMethod: selectedPayment,
          subtotal,
          discount: totalDiscount,
          total,
          status: 'completed',
          items: itemsForSale,
        },
        { id: saleId, createdAt }
      );

      const title = await createFinancialTitle({
        kind: 'ar',
        origin: 'pdv',
        refId: saleId,
        partyId: client?.id ?? null,
        partyName: client?.name ?? null,
        description: `Venda PDV ${saleId.slice(0, 8)}`,
        amount: total,
        dueDate: today,
      });

      const method = resolveFinancialMethodFromPos(selectedPayment);
      const isImmediate = method === 'money' || method === 'pix' || method === 'credit' || method === 'debit';
      if (isImmediate) {
        await registerPayment({
          titleId: title.id,
          amount: total,
          method,
          notes: 'Baixa automática (PDV)',
        });

        await addTransaction(
          session.id,
          'in',
          'sale',
          total,
          `Venda PDV ${saleId.slice(0, 8)} - ${cart.length} itens`,
          selectedPayment,
          { refId: saleId }
        );
      }

      alert("Venda finalizada com sucesso!");
      
      // Reset POS
      setCart([]);
      setClient(null);
      setGlobalDiscount({ type: 'fixed', value: 0 });
      setSelectedPayment('money');
      
      // Update session info (optional, just to refresh balance if needed)
      checkSession();
      
    } catch (error) {
      alert("Erro ao finalizar venda: " + (error as Error).message);
    } finally {
      setProcessingSale(false);
    }
  }
  
  // Totals Calculation
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const itemsDiscount = cart.reduce((acc, item) => acc + (item.discount * item.quantity), 0);
  
  let totalDiscount = itemsDiscount;
  if (globalDiscount.type === 'fixed') {
    totalDiscount += globalDiscount.value;
  } else {
    totalDiscount += (subtotal - itemsDiscount) * (globalDiscount.value / 100);
  }
  
  const total = Math.max(0, subtotal - totalDiscount);

  // Handlers
  const handleAddProduct = (product: Product) => {
    if (product.has_lot_control) {
      alert(`O produto "${product.name}" exige lote. No PDV, a venda por lote ainda não está habilitada.`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.price * (item.quantity + 1)) - (item.discount * (item.quantity + 1)) }
            : item
        );
      }
      return [...prev, {
        id: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity: 1,
        discount: 0,
        total: product.price
      }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return {
          ...item,
          quantity: newQuantity,
          total: (item.price * newQuantity) - (item.discount * newQuantity)
        };
      }
      return item;
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const handleDiscountChange = (value: number, type: 'percentage' | 'fixed') => {
    setGlobalDiscount({ type, value });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-100 overflow-hidden">
      {/* Custom Header for POS - Minimalist */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-1.5 rounded-md">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-slate-800">PDV <span className="text-slate-400 font-normal">| Frente de Caixa</span></span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="text-xs text-slate-500">Operador</div>
            <div className="text-sm font-medium text-slate-800">{auth.profile?.fullName ?? auth.session?.email ?? "-"}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.history.back()} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
            <X className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        
        {/* LEFT COLUMN: Product Search & Cart (65%) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col border-r border-slate-200 bg-white h-full">
          {/* Search Area */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <ProductSearch 
              onSelect={handleAddProduct} 
              className="w-full"
            />
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {/* Quick Categories or Tags could go here */}
              <span className="text-xs text-slate-400 px-2 py-1">Atalhos: F2 Buscar Produto | F3 Buscar Cliente | F9 Finalizar</span>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
            {cart.length > 0 ? (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">{item.name}</div>
                      <div className="text-xs text-slate-500 flex gap-2">
                        <span>SKU: {item.sku || '-'}</span>
                        <span>Unit: {formatCurrency(item.price)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-slate-200 rounded-md bg-slate-50">
                        <button 
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          className="p-1 hover:bg-slate-200 text-slate-600 rounded-l-md transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                        <button 
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          className="p-1 hover:bg-slate-200 text-slate-600 rounded-r-md transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-right w-24">
                        <div className="font-bold text-slate-900">{formatCurrency(item.total)}</div>
                        {item.discount > 0 && (
                          <div className="text-xs text-red-500">Desc: {formatCurrency(item.discount * item.quantity)}</div>
                        )}
                      </div>

                      <button 
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Caixa Livre</p>
                <p className="text-sm">Escaneie um produto ou busque para começar</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Transaction Details (35%) */}
        <div className="col-span-12 lg:col-span-4 bg-white flex flex-col h-full shadow-xl z-20">
          
          {/* Client Section */}
          <div className="p-4 border-b border-slate-200">
            <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block tracking-wider">Cliente / Fornecedor</label>
            {client ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-200 text-blue-700 p-2 rounded-full">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-blue-900 text-sm">{client.name}</div>
                    <div className="text-xs text-blue-600">Cliente selecionado</div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setClient(null)} className="h-8 w-8 p-0 text-blue-400 hover:text-blue-600">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <ContactSearch 
                onSelect={(c) => setClient({ id: c.id, name: c.name })}
              />
            )}
          </div>

          {/* Payment Methods */}
          <div className="p-4 flex-1 overflow-y-auto">
            <label className="text-xs font-semibold text-slate-500 uppercase mb-3 block tracking-wider">Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200",
                    selectedPayment === method.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                  )}
                >
                  <method.icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{method.label}</span>
                </button>
              ))}
            </div>

            {/* Discount Section */}
            <div className="mt-6">
               <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block tracking-wider">Desconto Global</label>
               <div className="flex gap-2">
                 <div className="relative flex-1">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                   <Input 
                     type="number" 
                     className="pl-7" 
                     placeholder="Valor fixo" 
                     value={globalDiscount.type === 'fixed' && globalDiscount.value > 0 ? globalDiscount.value : ''}
                     onChange={(e) => handleDiscountChange(Number(e.target.value), 'fixed')}
                   />
                 </div>
                 <div className="relative flex-1">
                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                   <Input 
                     type="number" 
                     className="pr-7" 
                     placeholder="Porcentagem"
                     value={globalDiscount.type === 'percentage' && globalDiscount.value > 0 ? globalDiscount.value : ''}
                     onChange={(e) => handleDiscountChange(Number(e.target.value), 'percentage')}
                   />
                 </div>
               </div>
            </div>
          </div>

          {/* Totals & Action */}
          <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Descontos</span>
                <span className="text-red-500">-{formatCurrency(totalDiscount)}</span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-200">
              <div className="flex justify-between items-end mb-4">
                <span className="text-slate-900 font-bold text-lg">Total a Pagar</span>
                <span className="text-3xl font-bold text-blue-600">{formatCurrency(total)}</span>
              </div>
              
              <Button 
                className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 text-white font-bold tracking-wide rounded-xl flex items-center justify-center gap-2"
                onClick={handleFinalizeSale}
                disabled={cart.length === 0 || processingSale || !session}
              >
                <Save className="w-6 h-6" />
                {processingSale ? "FINALIZANDO..." : "FINALIZAR VENDA (F9)"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Open Cash Modal */}
      {showOpenCashModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Caixa Fechado</h2>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="max-w-3xl">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Abrir Caixa</h3>
                <p className="text-slate-500 mb-6">Para iniciar as vendas, é necessário abrir o caixa. Informe o saldo inicial (fundo de troco).</p>

                <div className="text-left max-w-md">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Saldo Inicial (R$)</label>
                  <Input 
                    type="number" 
                    placeholder="0,00"
                    className="text-lg py-6"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3 justify-end">
              <Button 
                variant="ghost" 
                onClick={() => window.history.back()}
                className="text-slate-600"
              >
                Sair
              </Button>
              <Button 
                onClick={handleOpenSession} 
                className="h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                Abrir Caixa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
