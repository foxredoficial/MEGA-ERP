import { apiFetch } from "./api";

export type BizDocumentType =
  | "proposal"
  | "contract"
  | "purchase_order"
  | "incoming_invoice"
  | "production_order"
  | "nfe"
  | "nfce"
  | "service_invoice";

export type BizDocument = {
  id: string;
  type: BizDocumentType;
  number: string;
  partyId: string | null;
  partyName: string | null;
  date: string;
  status: string;
  notes: string | null;
  totals: {
    count: number;
    subtotal: number;
    discount: number;
    total: number;
  };
  items: BizDocumentItem[];
  payload: any | null;
  createdAt: string;
  updatedAt: string;
};

export type BizDocumentItem = {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
};

export async function listDocs(args: { type: BizDocumentType; query?: string; status?: string }) {
  const params = new URLSearchParams();
  params.set("type", args.type);
  if (args.query) params.set("query", args.query);
  if (args.status) params.set("status", args.status);
  const qs = params.toString();
  const data = await apiFetch<{ docs: BizDocument[] }>(`/api/docs?${qs}`, { method: "GET" });
  return data.docs;
}

export async function getDoc(id: string) {
  const data = await apiFetch<{ doc: BizDocument }>(`/api/docs/${id}`, { method: "GET" });
  return data.doc;
}

export async function createDoc(input: {
  type: BizDocumentType;
  partyId?: string | null;
  partyName?: string | null;
  date: string;
  status: string;
  notes?: string | null;
  items?: Omit<BizDocumentItem, "id">[];
  totalOverride?: number | null;
}) {
  const data = await apiFetch<{ doc: BizDocument }>("/api/docs", { method: "POST", body: JSON.stringify(input) });
  return data.doc;
}

export async function updateDoc(id: string, input: {
  partyId?: string | null;
  partyName?: string | null;
  date: string;
  status: string;
  notes?: string | null;
  items?: Omit<BizDocumentItem, "id">[];
  totalOverride?: number | null;
}) {
  const data = await apiFetch<{ doc: BizDocument }>(`/api/docs/${id}`, { method: "PUT", body: JSON.stringify(input) });
  return data.doc;
}

export async function cancelDoc(id: string) {
  const data = await apiFetch<{ doc: BizDocument }>(`/api/docs/${id}`, { method: "DELETE" });
  return data.doc;
}

export async function issueDoc(id: string) {
  const data = await apiFetch<{ doc: BizDocument }>(`/api/docs/${id}/issue`, { method: "POST", body: JSON.stringify({}) });
  return data.doc;
}
