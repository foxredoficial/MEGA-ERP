import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Printer,
  Download,
  User,
  Calendar
} from "lucide-react";
import { BlingLayout } from "@/components/BlingLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getContacts, deleteContact, type Contact } from "@/lib/api_contacts";
import { Badge } from "@/components/ui/Badge";

export function ContactList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    try {
      setLoading(true);
      const data = await getContacts();
      setContacts(data);
    } catch (error) {
      console.error("Erro ao carregar contatos:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este contato?")) return;
    try {
      await deleteContact(id);
      loadContacts();
    } catch (error) {
      console.error("Erro ao excluir contato:", error);
    }
  }

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.fantasy_name && c.fantasy_name.toLowerCase().includes(search.toLowerCase())) ||
    (c.cpf_cnpj && c.cpf_cnpj.includes(search)) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <BlingLayout>
      <div className="space-y-6">
        {/* Header Section - More modern and clean */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Clientes e Fornecedores</h1>
            <p className="text-sm text-zinc-500 mt-1">Gerencie sua base de contatos de forma eficiente.</p>
          </div>
          <div className="flex items-center gap-3">
             <Link to="/app/contatos/novo">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2">
                <Plus className="w-4 h-4" />
                Novo Contato
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters & Toolbar - Clean card design */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-zinc-200 flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="Buscar contatos..." 
              className="pl-10 border-none shadow-none focus-visible:ring-0 bg-transparent h-12 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="h-8 w-px bg-zinc-200 hidden md:block"></div>
          <div className="flex items-center gap-2 pr-2 w-full md:w-auto justify-end">
             <Button variant="ghost" className="text-zinc-500 hover:text-blue-600">
               <Calendar className="w-4 h-4 mr-2" />
               <span className="text-sm">Filtrar Data</span>
             </Button>
             <Button variant="ghost" className="text-zinc-500 hover:text-blue-600">
               <Download className="w-4 h-4 mr-2" />
               <span className="text-sm">Exportar</span>
             </Button>
          </div>
        </div>

        {/* Table - Modern look with better spacing and typography */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50/50 text-zinc-500 font-medium border-b border-zinc-100">
                <tr>
                  <th className="px-6 py-4 w-14">
                    <input type="checkbox" className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
                  </th>
                  <th className="px-6 py-4">Nome / Fantasia</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Localização</th>
                  <th className="px-6 py-4">Documento</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p>Carregando contatos...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <User className="w-12 h-12 text-zinc-300 mb-4" />
                        <h3 className="text-lg font-medium text-zinc-900 mb-1">Nenhum contato encontrado</h3>
                        <p className="text-zinc-500 mb-6">Comece adicionando seu primeiro cliente ou fornecedor.</p>
                        <Link to="/app/contatos/novo">
                          <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                            Adicionar Novo
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <input type="checkbox" className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <Link to={`/app/contatos/${contact.id}`} className="font-semibold text-zinc-900 hover:text-blue-600 transition-colors">
                            {contact.name}
                          </Link>
                          {contact.fantasy_name && (
                            <span className="text-xs text-zinc-500">{contact.fantasy_name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-zinc-600">
                           {contact.email && <span className="text-xs mb-0.5">{contact.email}</span>}
                           {(contact.phone || contact.mobile) && <span className="text-xs text-zinc-400">{contact.phone || contact.mobile}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-600">
                        {contact.address_city ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 text-xs font-medium text-zinc-700">
                            {contact.address_city}{contact.address_state ? `/${contact.address_state}` : ''}
                          </span>
                        ) : (
                          <span className="text-zinc-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                        {contact.cpf_cnpj || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/app/contatos/${contact.id}`}>
                            {/* Edit Button */}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-600 hover:bg-blue-50">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(contact.id)}
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
