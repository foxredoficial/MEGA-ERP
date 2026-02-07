import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { getContacts, type Contact } from "@/lib/api_contacts";
import { cn } from "@/lib/utils";

interface ContactSearchProps {
  onSelect: (contact: Contact) => void;
  selectedContactId?: string;
  className?: string;
}

export function ContactSearch({ onSelect, selectedContactId, className }: ContactSearchProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (selectedContactId && contacts.length > 0) {
      const selected = contacts.find(c => c.id === selectedContactId);
      if (selected) {
        setSearch(selected.name);
      }
    }
  }, [selectedContactId, contacts]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const filteredContacts = contacts.filter(c => {
    const term = search.toLowerCase();
    const cleanTerm = term.replace(/[^a-z0-9]/g, "");
    
    // 1. Standard text search
    if (
      c.name.toLowerCase().includes(term) ||
      (c.fantasy_name && c.fantasy_name.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term))
    ) {
      return true;
    }

    // 2. Smart search for numbers/documents
    if (cleanTerm) {
      const cleanCpfCnpj = (c.cpf_cnpj || "").replace(/[^a-z0-9]/g, "");
      const cleanPhone = (c.phone || "").replace(/[^a-z0-9]/g, "");
      const cleanMobile = (c.mobile || "").replace(/[^a-z0-9]/g, "");
      
      let cleanDate = "";
      if (c.birth_date) {
        const dateParts = c.birth_date.split("T")[0].split("-");
        if (dateParts.length === 3) {
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

  const handleSelect = (contact: Contact) => {
    setSearch(contact.name);
    setIsOpen(false);
    onSelect(contact);
  };

  return (
    <div className={cn("relative", className)} ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar cliente (Nome, CPF/CNPJ, Telefone...)"
          className="pl-10"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {loading && (
           <div className="absolute right-3 top-1/2 -translate-y-1/2">
             <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
           </div>
        )}
      </div>

      {isOpen && search.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredContacts.length > 0 ? (
            <ul className="py-1">
              {filteredContacts.map(contact => (
                <li
                  key={contact.id}
                  className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                  onClick={() => handleSelect(contact)}
                >
                  <div className="font-medium text-slate-900">{contact.name}</div>
                  <div className="text-slate-500 text-xs flex flex-wrap gap-x-2 gap-y-1">
                     {contact.cpf_cnpj && <span>Doc: {contact.cpf_cnpj}</span>}
                     {contact.phone && <span>Tel: {contact.phone}</span>}
                     {contact.mobile && <span>Cel: {contact.mobile}</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              {loading ? "Carregando..." : "Nenhum cliente encontrado."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
