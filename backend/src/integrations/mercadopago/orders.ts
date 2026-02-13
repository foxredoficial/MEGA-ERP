import { mpRequest } from "./client.js";

export type MpOrderItem = {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
};

export type MpCreateOrderInput = {
  external_reference: string;
  description?: string;
  items: MpOrderItem[];
  notification_url?: string;
};

type MpOrderResponse = {
  id?: string | number;
  external_reference?: string;
};

export async function createMpOrder(input: MpCreateOrderInput) {
  const payload = {
    external_reference: input.external_reference,
    items: input.items.map((it) => ({
      title: it.title,
      quantity: it.quantity,
      unit_price: it.unit_price,
      currency_id: it.currency_id ?? "BRL",
    })),
    notification_url: input.notification_url,
  };

  const res = await mpRequest<MpOrderResponse>({
    method: "POST",
    url: "https://api.mercadopago.com/merchant_orders",
    body: payload,
  });

  if (res.status < 200 || res.status >= 300 || !res.data?.id) {
    throw new Error(`Falha ao criar Order no Mercado Pago (status ${res.status}).`);
  }

  return {
    orderId: String(res.data.id),
    externalReference: res.data.external_reference ?? input.external_reference,
  };
}

