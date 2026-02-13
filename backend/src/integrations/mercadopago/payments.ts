import { mpRequest } from "./client.js";

export type MpCreatePaymentInput = {
  transaction_amount: number;
  description?: string;
  payment_method_id: string;
  payer: {
    email: string;
    identification?: { type: string; number: string };
  };
  token?: string;
  installments?: number;
  issuer_id?: string;
  external_reference?: string;
  notification_url?: string;
};

export async function createMpPayment(input: MpCreatePaymentInput) {
  const res = await mpRequest<any>({
    method: "POST",
    url: "https://api.mercadopago.com/v1/payments",
    body: input,
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Falha ao criar pagamento no Mercado Pago (status ${res.status}).`);
  }
  return res.data;
}

export async function getMpPayment(paymentId: string) {
  const res = await mpRequest<any>({
    method: "GET",
    url: `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Falha ao consultar pagamento no Mercado Pago (status ${res.status}).`);
  }
  return res.data;
}

