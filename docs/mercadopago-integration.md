# Integração Mercado Pago (SaaS PDV ERP)

Este projeto já está preparado para integrar Mercado Pago em dois fluxos:

1) **Assinatura recorrente (preapproval)**: já existente em `/api/billing/checkout`.
2) **Checkout Transparente (pagamentos) + Orders**: endpoints adicionados para você plugar o frontend (Bricks/Checkout API) apenas configurando as variáveis.

## Variáveis de ambiente (backend)

Configure no ambiente do backend (ex.: `.env` no diretório `backend/`).

- `MP_ACCESS_TOKEN` (obrigatório): chave privada do Mercado Pago.
- `MP_PUBLIC_KEY` (opcional): chave pública para integração no frontend.
- `WEBHOOK_BASE_URL` (recomendado): URL pública para receber webhooks.
- `MP_WEBHOOK_SIGNATURE_SECRET` (opcional): segredo para validar assinatura do webhook.

## Endpoints

### Recorrência (já existente)

- `POST /api/billing/checkout`
  - cria uma assinatura recorrente (preapproval) e retorna `initPoint`.
  - webhook: `POST /api/webhooks/mercadopago`

### Orders

- `POST /api/billing/orders`
  - cria uma order vinculada a um `planId`.
  - webhook: `POST /api/webhooks/mercadopago/orders`

### Checkout Transparente (pagamentos)

- `POST /api/billing/payments`
  - encaminha um pagamento para a API de pagamentos do Mercado Pago.
  - webhook: `POST /api/webhooks/mercadopago/payments`

- `GET /api/billing/payments/:id`
  - consulta um pagamento.

## Admin

- `GET /api/admin/integrations/mercadopago`
  - retorna quais variáveis estão configuradas.
  - página: Admin → Configurações → Mercado Pago.

## Observação

O Checkout Transparente normalmente usa a chave pública no frontend para tokenização/Bricks e chama o backend para criar o pagamento.
Assim que você inserir as chaves e definir o fluxo desejado no frontend, o backend já está pronto para operar.

