import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Save, 
  ShoppingCart,
  User,
  Calendar,
  Package,
  Trash2
} from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ContactSearch } from "@/components/ContactSearch";
import { ProductSearch } from "@/components/ProductSearch";
import { formatCurrency } from "@/lib/utils";
import { getSalesOrder, upsertSalesOrder, type SalesOrderStatus } from "@/lib/api_sales_orders";
import { addStockMovement, getProduct } from "@/lib/api_products";
import { createFinancialTitle } from "@/lib/api_financial_titles";

interface OrderItem {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export function SalesOrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [initialStatus, setInitialStatus] = useState<SalesOrderStatus | null>(null);
  
  const [formData, setFormData] = useState({
    clientId: "",
    client: "",
    date: new Date().toISOString().split('T')[0],
    status: 'open' as SalesOrderStatus,
    observations: ""
  });

  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (!id) return;
    load(id);
  }, [id]);

  async function load(orderId: string) {
    try {
      setLoading(true);
      const order = await getSalesOrder(orderId);
      if (!order) {
        navigate("/app/vendas/pedidos");
        return;
      }
      setFormData({
        clientId: order.customerId,
        client: order.customerName,
        date: order.date,
        status: order.status,
        observations: order.observations,
      });
      setItems(order.items);
      setInitialStatus(order.status);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = (product: any) => {
    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      description: product.name,
      quantity: 1,
      unitPrice: product.price,
      discount: 0,
      total: product.price
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof OrderItem, value: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updates = { [field]: value };
        const quantity = field === 'quantity' ? value : item.quantity;
        const unitPrice = field === 'unitPrice' ? value : item.unitPrice;
        const discount = field === 'discount' ? value : item.discount;
        
        const total = (quantity * unitPrice) - discount;
        
        return { ...item, ...updates, total: Math.max(0, total) };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const totals = items.reduce((acc, item) => ({
    count: acc.count + item.quantity,
    subtotal: acc.subtotal + (item.quantity * item.unitPrice),
    discount: acc.discount + item.discount,
    total: acc.total + item.total
  }), { count: 0, subtotal: 0, discount: 0, total: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!formData.client) {
        alert("Cliente é obrigatório");
        setSaving(false);
        return;
      }
      if (items.length === 0) {
        alert("Adicione pelo menos um item ao pedido");
        setSaving(false);
        return;
      }

      const nextStatus = formData.status;

      const order = await upsertSalesOrder({
        id,
        customerId: formData.clientId,
        customerName: formData.client,
        date: formData.date,
        status: nextStatus,
        observations: formData.observations,
        items,
      });

      const prevStatus = initialStatus;
      const shouldCreateTitle = nextStatus === 'billed' && prevStatus !== 'billed' && prevStatus !== 'delivered' && prevStatus !== 'canceled';
      const shouldStockOut = nextStatus === 'delivered' && prevStatus !== 'delivered' && prevStatus !== 'canceled';

      if (shouldCreateTitle) {
        await createFinancialTitle({
          kind: 'ar',
          origin: 'sales_order',
          refId: order.id,
          partyId: order.customerId,
          partyName: order.customerName,
          description: `Pedido ${order.number}`,
          amount: order.totals.total,
          dueDate: order.date,
        });
      }

      if (shouldStockOut) {
        const products = await Promise.all(
          [...new Set(order.items.map((i) => i.productId))].map((pid) => getProduct(pid))
        );
        const byId = new Map(products.map((p) => [p.id, p] as const));
        for (const item of order.items) {
          const p = byId.get(item.productId);
          if (!p) throw new Error('Produto não encontrado.');
          if (p.has_lot_control) {
            throw new Error(`O produto "${p.name}" exige controle de lote. Selecione um lote para dar baixa.`);
          }
          if (p.stock < item.quantity) {
            throw new Error(`Estoque insuficiente para: ${p.name}. Saldo atual: ${p.stock}`);
          }
        }
        for (const item of order.items) {
          await addStockMovement(item.productId, {
            type: 'out',
            quantity: item.quantity,
            reason: `Pedido ${order.number}`,
          });
        }
      }

      alert("Pedido salvo com sucesso!");
      navigate("/app/vendas/pedidos");
    } catch (error) {
      alert("Erro ao salvar pedido: " + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <BlingLayout>
        <div className="pt-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </BlingLayout>
    );
  }

  return (
    <BlingLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/app/vendas/pedidos" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {id ? "Editar Pedido" : "Novo Pedido de Venda"}
              </h1>
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                <ShoppingCart className="w-4 h-4" />
                <span>Vendas</span>
                <span>/</span>
                <span>{id ? "Edição" : "Cadastro"}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              type="button"
              onClick={() => navigate("/app/vendas/pedidos")}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Dados do Cliente
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                  <ContactSearch 
                    contactType="cliente"
                    onSelect={(contact) => {
                      handleChange("client", contact.name);
                      handleChange("clientId", contact.id);
                    }}
                    selectedContactId={formData.clientId}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Dados do Pedido
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                  >
                    <option value="open">Em aberto</option>
                    <option value="billed">Faturado</option>
                    <option value="delivered">Entregue</option>
                    <option value="canceled">Cancelado</option>
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Itens do Pedido
              </h2>
              
              <div className="space-y-4">
                <ProductSearch onSelect={handleAddItem} />

                {items.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Produto</th>
                          <th className="px-4 py-3 w-24">Qtd</th>
                          <th className="px-4 py-3 w-32">Vl. Unit.</th>
                          <th className="px-4 py-3 w-32">Desc.</th>
                          <th className="px-4 py-3 w-32 text-right">Total</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{item.description}</div>
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                min="1"
                                className="h-8 w-20"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className="h-8 w-28"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateItem(item.id, 'unitPrice', Number(e.target.value))}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className="h-8 w-28"
                                value={item.discount}
                                onChange={(e) => handleUpdateItem(item.id, 'discount', Number(e.target.value))}
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900">
                              {formatCurrency(item.total)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-medium">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-right text-slate-600">Subtotal</td>
                          <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(totals.subtotal)}</td>
                          <td></td>
                        </tr>
                        {totals.discount > 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-right text-slate-600">Descontos</td>
                            <td className="px-4 py-3 text-right text-red-600">-{formatCurrency(totals.discount)}</td>
                            <td></td>
                          </tr>
                        )}
                        <tr className="border-t border-slate-200">
                          <td colSpan={4} className="px-4 py-3 text-right text-lg text-slate-900">Total</td>
                          <td className="px-4 py-3 text-right text-lg text-blue-600 font-bold">{formatCurrency(totals.total)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">Nenhum item adicionado ao pedido</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Detalhes da Venda
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data de Emissão</label>
                  <Input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select 
                    className="w-full rounded-lg border-slate-200 text-sm focus:ring-blue-500 focus:border-blue-500"
                    value={formData.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                  >
                    <option value="open">Em Aberto</option>
                    <option value="billed">Faturado</option>
                    <option value="delivered">Entregue</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                  <textarea 
                    className="w-full rounded-lg border-slate-200 text-sm focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                    placeholder="Observações internas..."
                    value={formData.observations}
                    onChange={(e) => handleChange("observations", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </BlingLayout>
  );
}
