export type ApiError = {
  message: string;
  status: number;
  details?: unknown;
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

async function readBodySafely(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  try {
    return await res.text();
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${apiBaseUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await readBodySafely(res);
    const message =
      typeof body === "object" && body && "message" in body && typeof (body as { message?: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Falha na requisição (${res.status}).`;

    const err: ApiError = { message, status: res.status, details: body };
    throw err;
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const body = await readBodySafely(res);
    const err: ApiError = {
      message:
        "Resposta inválida do backend. Verifique se a API está rodando e se o proxy /api está apontando para o backend correto.",
      status: res.status,
      details: body,
    };
    throw err;
  }
  return (await res.json()) as T;
}

export type Plan = {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  billingInterval: "month";
  features: string[];
  isFeatured: boolean;
};

export type MeResponse = {
  user: { id: string; email: string; role: 'user' | 'admin' };
  profile: {
    fullName: string;
    companyName: string | null;
    document: string | null;
    phone: string | null;
    addressZip: string | null;
    addressStreet: string | null;
    addressNumber: string | null;
    addressNeighborhood: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressComplement: string | null;
    // Novos
    personType: 'fisica' | 'juridica' | null;
    ie: string | null;
    im: string | null;
    cnae: string | null;
    taxRegime: string | null;
    mobile: string | null;
    emailBilling: string | null;
    website: string | null;
  };
  auth: {
    hasPassword: boolean;
    googleId: string | null;
  };
};

export type Subscription = {
  id: string;
  status: "active" | "canceled" | "past_due";
  plan: Plan;
  startedAt: string;
  endedAt: string | null;
};

export async function getPublicPlans(): Promise<Plan[]> {
  const data = await apiFetch<{ plans: Plan[] }>("/api/public/plans", { method: "GET" });
  return data.plans;
}

export async function register(args: {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  planId?: string | null;
}): Promise<MeResponse> {
  return apiFetch<MeResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export async function login(args: { email: string; password: string }): Promise<MeResponse> {
  return apiFetch<MeResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export async function logout(): Promise<void> {
  await apiFetch<void>("/api/auth/logout", { method: "POST" });
}

export async function getMe(silent = false): Promise<MeResponse> {
  try {
    return await apiFetch<MeResponse>("/api/auth/me", { method: "GET" });
  } catch (err) {
    if (silent && (err as ApiError).status === 401) {
      throw err; // Re-throw but caller handles it
    }
    throw err;
  }
}

export async function requestPasswordReset(args: { email: string }): Promise<void> {
  await apiFetch<void>("/api/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export async function updatePassword(args: { currentPassword?: string; newPassword: string }): Promise<void> {
  await apiFetch("/api/me/password", { method: "PUT", body: JSON.stringify(args) });
}

export async function unlinkGoogleAccount(): Promise<void> {
  await apiFetch("/api/auth/google/unlink", { method: "POST" });
}

export async function updateProfile(args: {
  fullName: string;
  companyName: string | null;
  document?: string | null;
  phone?: string | null;
  addressZip?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressComplement?: string | null;
  personType?: 'fisica' | 'juridica' | null;
  ie?: string | null;
  im?: string | null;
  cnae?: string | null;
  taxRegime?: string | null;
  mobile?: string | null;
  emailBilling?: string | null;
  website?: string | null;
}): Promise<{ profile: MeResponse["profile"] }> {
  return apiFetch<{ profile: MeResponse["profile"] }>("/api/me/profile", {
    method: "PUT",
    body: JSON.stringify(args),
  });
}

export async function getMySubscription(): Promise<{ subscription: Subscription | null }> {
  return apiFetch<{ subscription: Subscription | null }>("/api/me/subscription", { method: "GET" });
}

export async function createCheckout(args: { planId: string }): Promise<{ initPoint: string }> {
  return apiFetch<{ initPoint: string }>("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export * from "./api_products";
export * from "./api_categories";
export * from "./api_contacts";
export * from "./api_salespersons";
export * from "./api_admin";


