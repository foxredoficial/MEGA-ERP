import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  User,
  Percent,
  Phone,
  Mail
} from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getSalespersons, deleteSalesperson, type Salesperson } from "@/lib/api_salespersons";

export function SalespersonList() {
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSalespersons();
  }, []);

  async function loadSalespersons() {
    try {
      setLoading(true);
      const data = await getSalespersons();
      setSalespersons(data || []);
    } catch (error) {
      console.error("Erro ao carregar vendedores:", error);
      setSalespersons([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este vendedor?")) return;
    try {
      await deleteSalesperson(id);
      loadSalespersons();
    } catch (error) {
      console.error("Erro ao excluir vendedor:", error);
    }
  }

  const filteredSalespersons = salespersons.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
    (s.phone && s.phone.includes(search))
  );

  return (
    <BlingLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Vendedores</h1>
            <p className="text-sm text-zinc-500 mt-1">Gerencie sua equipe de vendas e comissões.</p>
          </div>
          <div className="flex items-center gap-3">
             <Link to="/app/vendedores/novo">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2">
                <Plus className="w-4 h-4" />
                Novo Vendedor
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white p-1 rounded-xl shadow-sm border border-zinc-200 flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="Buscar vendedores..." 
              className="pl-10 border-none shadow-none focus-visible:ring-0 bg-transparent h-12 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50/50 text-zinc-500 font-medium border-b border-zinc-100">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Comissão (%)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p>Carregando vendedores...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredSalespersons.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <User className="w-12 h-12 text-zinc-300 mb-4" />
                        <h3 className="text-lg font-medium text-zinc-900 mb-1">Nenhum vendedor encontrado</h3>
                        <p className="text-zinc-500 mb-6">Comece adicionando seu primeiro vendedor.</p>
                        <Link to="/app/vendedores/novo">
                          <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                            Adicionar Novo
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSalespersons.map((salesperson) => (
                    <tr key={salesperson.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <Link to={`/app/vendedores/${salesperson.id}`} className="font-semibold text-zinc-900 hover:text-blue-600 transition-colors">
                          {salesperson.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                           {salesperson.email && (
                             <div className="flex items-center gap-1.5 text-zinc-600">
                               <Mail className="w-3.5 h-3.5 text-zinc-400" />
                               <span className="text-xs">{salesperson.email}</span>
                             </div>
                           )}
                           {salesperson.phone && (
                             <div className="flex items-center gap-1.5 text-zinc-600">
                               <Phone className="w-3.5 h-3.5 text-zinc-400" />
                               <span className="text-xs">{salesperson.phone}</span>
                             </div>
                           )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
                          <Percent className="w-4 h-4 text-zinc-400" />
                          {salesperson.commission_rate ? salesperson.commission_rate.toFixed(2) : "0.00"}%
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          salesperson.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-zinc-100 text-zinc-800'
                        }`}>
                          {salesperson.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/app/vendedores/${salesperson.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600 hover:bg-blue-50">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(salesperson.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BlingLayout>
  );
}
