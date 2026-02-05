import { apiFetch } from "./api";

export type Category = {
  id: string;
  user_id?: string;
  name: string;
  parent_id: string | null; // For subcategories
  description: string | null;
  color?: string;
  created_at?: string;
  updated_at?: string;
  
  // Helper for UI (optional, depending on backend)
  children?: Category[];
};

export type CategoryInput = Omit<Category, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'children'>;

export async function getCategories() {
  return apiFetch<{ categories: Category[] }>("/api/categories").then(r => r.categories).catch(() => []);
}

export async function getCategory(id: string) {
  return apiFetch<{ category: Category }>(`/api/categories/${id}`).then(r => r.category);
}

export async function createCategory(data: Partial<CategoryInput>) {
  return apiFetch<{ id: string }>("/api/categories", {
    method: "POST",
    body: JSON.stringify(data),
  }).then(r => r.id);
}

export async function updateCategory(id: string, data: Partial<CategoryInput>) {
  return apiFetch<{ success: boolean }>(`/api/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: string) {
  return apiFetch<{ success: boolean }>(`/api/categories/${id}`, {
    method: "DELETE",
  });
}

// Helpers
export function buildCategoryTree(cats: Category[]) {
  const map = new Map<string, Category & { children: Category[] }>();
  const roots: (Category & { children: Category[] })[] = [];

  cats.forEach(c => map.set(c.id, { ...c, children: [] }));

  cats.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function flattenCategoryTree(nodes: Category[], level = 0, result: (Category & { level: number })[] = []) {
  for (const node of nodes) {
    result.push({ ...node, level });
    if (node.children && node.children.length > 0) {
      flattenCategoryTree(node.children, level + 1, result);
    }
  }
  return result;
}
