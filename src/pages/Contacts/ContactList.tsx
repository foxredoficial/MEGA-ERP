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
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

interface ContactListProps {
  type?: 'client' | 'supplier';
}

export function ContactList({ type }: ContactListProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isSupplier = type === 'supplier';
  const title = isSupplier ? "Fornecedores" : "Clientes";
  const basePath = isSupplier ? "/app/fornecedores" : "/app/clientes";

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

  function handleDeleteClick(id: string) {
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;

    try {
      await deleteContact(deleteId);
      loadContacts();
    } catch (error) {
      console.error("Erro ao excluir contato:", error);
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    }
  }

  const filteredContacts = contacts.filter(c => {
    // Filter by type if specified
    if (type) {
      const contactType = c.contact_type || 'cliente'; // Default to client if null
      if (type === 'client' && contactType === 'fornecedor') return false;
      if (type === 'supplier' && contactType !== 'fornecedor') return false;
    }

    const term = search.toLowerCase();
    const cleanTerm = term.replace(/[^a-z0-9]/g, "");

    // 1. Standard text search (Name, Fantasy Name, Email)
    if (
      c.name.toLowerCase().includes(term) ||
      (c.fantasy_name && c.fantasy_name.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term))
    ) {
      return true;
    }

    // 2. "Smart" search for numbers/documents (CPF/CNPJ, Phone, Mobile, Date)
    // Only proceed if we have a searchable term after cleaning
    if (cleanTerm) {
      const cleanCpfCnpj = (c.cpf_cnpj || "").replace(/[^a-z0-9]/g, "");
      const cleanPhone = (c.phone || "").replace(/[^a-z0-9]/g, "");
      const cleanMobile = (c.mobile || "").replace(/[^a-z0-9]/g, "");
      
      // Handle date search (YYYY-MM-DD -> DDMMYYYY)
      let cleanDate = "";
      if (c.birth_date) {
        // Assuming format YYYY-MM-DD from backend
        const dateParts = c.birth_date.split("T")[0].split("-");
        if (dateParts.length === 3) {
          // dateParts[0] = YYYY, dateParts[1] = MM, dateParts[2] = DD
          // We want DDMMYYYY
          cleanDate = `${dateParts[2]}${dateParts[1]}${dateParts[0]}`;
        }
      }

      return (
        cleanCpfCnpj.includes(cleanTerm) ||
        cleanPhone.includes(cleanTerm) ||
        cleanMobile.includes(cleanTerm) ||
        cleanDate.includes(cleanTerm)
      );
    }

    return false;
  });

  return (
    <BlingLayout>
      <div className="space-y-6">
        {/* Header Section - More modern and clean */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie sua base de {title.toLowerCase()} de forma eficiente.</p>
          </div>
          <div className="flex items-center gap-3">
             <Link to={`${basePath}/novo`}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2">
                <Plus className="w-4 h-4" />
                Novo {isSupplier ? "Fornecedor" : "Cliente"}
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters & Toolbar - Clean card design */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nome, CPF/CNPJ, telefone ou email..." 
              className="pl-10 border-none shadow-none focus-visible:ring-0 bg-transparent h-12 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center gap-2 pr-2 w-full md:w-auto justify-end">
             <Button variant="ghost" className="text-slate-500 hover:text-blue-600">
               <Calendar className="w-4 h-4 mr-2" />
               <span className="text-sm">Filtrar Data</span>
             </Button>
             <Button variant="ghost" className="text-slate-500 hover:text-blue-600">
               <Download className="w-4 h-4 mr-2" />
               <span className="text-sm">Exportar</span>
             </Button>
          </div>
        </div>

        {/* Table - Modern look with better spacing and typography */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 w-14">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  </th>
                  <th className="px-6 py-4">Nome / Fantasia</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Cidade</th>
                  <th className="px-6 py-4">CPF/CNPJ</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p>Carregando {title.toLowerCase()}...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <User className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhum {isSupplier ? "fornecedor" : "cliente"} encontrado</h3>
                        <p className="text-slate-500 mb-6">Comece adicionando seu primeiro {isSupplier ? "fornecedor" : "cliente"}.</p>
                        <Link to={`${basePath}/novo`}>
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
                        <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <Link to={`${basePath}/${contact.id}`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                            {contact.name}
                          </Link>
                          {contact.fantasy_name && (
                            <span className="text-xs text-slate-500">{contact.fantasy_name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-slate-600">
                           {contact.email && <span className="text-xs mb-0.5">{contact.email}</span>}
                           {(contact.phone || contact.mobile) && <span className="text-xs text-slate-400">{contact.phone || contact.mobile}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {contact.address_city ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-700">
                            {contact.address_city}{contact.address_state ? `/${contact.address_state}` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                        {contact.cpf_cnpj || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`${basePath}/${contact.id}`}>
                            {/* Edit Button */}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteClick(contact.id)}
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

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`Excluir ${isSupplier ? "Fornecedor" : "Cliente"}`}
        description={`Tem certeza que deseja excluir este ${isSupplier ? "fornecedor" : "cliente"}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="danger"
      />
    </BlingLayout>
  );
}
