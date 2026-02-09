import { env } from "../env.js";

export type MegaNfeEnvironment = "homolog" | "prod";

export type MegaNfeIssueRequest = {
  kind: "nfe" | "nfce";
  environment: MegaNfeEnvironment;
  document: {
    id: string;
    number: string;
    date: string;
    total: number;
  };
  emitter: {
    companyName: string;
    document: string;
    ie?: string | null;
    address: {
      zip?: string | null;
      street?: string | null;
      number?: string | null;
      neighborhood?: string | null;
      city?: string | null;
      state?: string | null;
      complement?: string | null;
    };
  };
  recipient: {
    name: string;
    document?: string | null;
    ie?: string | null;
    address?: {
      zip?: string | null;
      street?: string | null;
      number?: string | null;
      neighborhood?: string | null;
      city?: string | null;
      state?: string | null;
      complement?: string | null;
    };
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
  }>;
};

export type MegaNfeIssueResponse = {
  status: "authorized" | "processing";
  accessKey: string;
  protocol?: string | null;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
};

export async function issueWithMegaNfe(req: MegaNfeIssueRequest): Promise<MegaNfeIssueResponse> {
  if (!env.MEGA_NFE_API_URL || !env.MEGA_NFE_API_KEY) {
    throw new Error("Emissão fiscal indisponível no momento.");
  }

  const url = new URL("/v1/nfe/issue", env.MEGA_NFE_API_URL);
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MEGA_NFE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });

  const text = await r.text();
  if (!r.ok) throw new Error(`Falha ao emitir nota: ${r.status}`);

  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!data || typeof data !== "object") throw new Error("Resposta inválida do serviço fiscal.");
  if (typeof data.accessKey !== "string" || data.accessKey.length < 10) throw new Error("Serviço fiscal não retornou chave.");
  const status = data.status === "authorized" ? "authorized" : "processing";

  return {
    status,
    accessKey: data.accessKey,
    protocol: typeof data.protocol === "string" ? data.protocol : null,
    pdfUrl: typeof data.pdfUrl === "string" ? data.pdfUrl : null,
    xmlUrl: typeof data.xmlUrl === "string" ? data.xmlUrl : null,
  };
}

