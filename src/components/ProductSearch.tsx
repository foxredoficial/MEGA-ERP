import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Package, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { getProducts, type Product } from "@/lib/api_products";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface ProductSearchProps {
  onSelect: (product: Product) => void;
  className?: string;
}

export function ProductSearch({ onSelect, className }: ProductSearchProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter(p => {
    const term = search.toLowerCase();
    
    return (
      p.name.toLowerCase().includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term))
    );
  });

  const handleSelect = (product: Product) => {
    setSearch(""); // Clear search after selection to allow adding another product
    setIsOpen(false);
    onSelect(product);
  };

  return (
    <div className={cn("relative", className)} ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          placeholder="Adicionar produto (Nome ou SKU...)"
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
             <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
           </div>
        )}
      </div>

      {isOpen && search.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {filteredProducts.length > 0 ? (
            <ul className="py-1">
              {filteredProducts.map(product => (
                <li
                  key={product.id}
                  className="px-4 py-2 hover:bg-zinc-50 cursor-pointer text-sm border-b border-zinc-50 last:border-0"
                  onClick={() => handleSelect(product)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium text-zinc-900">{product.name}</div>
                        <div className="text-zinc-500 text-xs flex gap-2">
                            {product.sku && <span>SKU: {product.sku}</span>}
                            <span>Estoque: {product.stock}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-medium text-zinc-900">{formatCurrency(product.price)}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-zinc-500 text-center flex flex-col items-center gap-2">
              {loading ? (
                <span>Carregando...</span>
              ) : (
                <>
                  <Package className="w-8 h-8 text-zinc-300" />
                  <span>Nenhum produto encontrado.</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
