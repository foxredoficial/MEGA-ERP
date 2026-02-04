import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  MoreVertical,
  Calendar,
  User,
  Wrench,
  AlertCircle
} from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatBRLFromCents } from "@/lib/money";

// Mock data for demonstration
const MOCK_ORDERS = [
  { id: 1, number: "OS-2024-001", client: "João Silva", date: "03/02/2026", status: "open", total: 15000, description: "Formatação e Instalação de Office" },
  { id: 2, number: "OS-2024-002", client: "Maria Souza", date: "02/02/2026", status: "in_progress", total: 45000, description: "Troca de Tela iPhone 13" },
  { id: 3, number: "OS-2024-003", client: "Empresa ABC Ltda", date: "01/02/2026", status: "finished", total: 120000, description: "Manutenção Servidor Dell" },
  { id: 4, number: "OS-2024-004", client: "Pedro Santos", date: "30/01/2026", status: "canceled", total: 0, description: "Orçamento não aprovado" },
];

const STATUS_MAP: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  open: { label: "Em Aberto", variant: "warning" },
  in_progress: { label: "Em Andamento", variant: "secondary" },
  finished: { label: "Concluído", variant: "success" },
  canceled: { label: "Cancelado", variant: "destructive" },
};

export function ServiceOrderList() {
  const [search, setSearch] = useState("");

  const filteredOrders = MOCK_ORDERS.filter(os => 
    os.client.toLowerCase().includes(search.toLowerCase()) ||
    os.number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <BlingLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Ordens de Serviço</h1>
            <p className="text-sm text-zinc-500 mt-1">Gerencie chamados técnicos, manutenções e serviços prestados.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/app/ordens-servico/novo">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2">
                <Plus className="w-4 h-4" />
                Nova OS
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters & Toolbar */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-zinc-200 flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="Pesquisar por cliente, número da OS..." 
              className="pl-10 border-none shadow-none focus-visible:ring-0 bg-transparent h-12 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="h-8 w-px bg-zinc-200 hidden md:block"></div>
          <div className="flex items-center gap-2 pr-2 w-full md:w-auto justify-end">
             <Button variant="ghost" className="text-zinc-500 hover:text-blue-600">
               <Filter className="w-4 h-4 mr-2" />
               <span className="text-sm">Filtros</span>
             </Button>
          </div>
        </div>

        {/* Empty State / Warning for Demo */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Módulo em Desenvolvimento</h3>
            <p className="text-sm text-blue-700 mt-1">
              Esta é uma visualização demonstrativa. Em breve você poderá criar, editar e gerenciar suas Ordens de Serviço completas integradas ao Catálogo de Serviços.
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50/50 text-zinc-500 font-medium border-b border-zinc-100">
                <tr>
                  <th className="px-6 py-4 w-14">
                    <input type="checkbox" className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
                  </th>
                  <th className="px-6 py-4">Número</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Serviço/Descrição</th>
                  <th className="px-6 py-4">Data Entrada</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Valor Total</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredOrders.map((os) => (
                  <tr key={os.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <input type="checkbox" className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-600 font-medium">
                      {os.number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">
                          {os.client.charAt(0)}
                        </div>
                        <span className="font-medium text-zinc-900">{os.client}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-3 h-3 text-zinc-400" />
                        <span className="truncate max-w-[200px]">{os.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-zinc-400" />
                        {os.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={STATUS_MAP[os.status].variant as any}>
                        {STATUS_MAP[os.status].label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-900">
                      {formatBRLFromCents(os.total)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BlingLayout>
  );
}
