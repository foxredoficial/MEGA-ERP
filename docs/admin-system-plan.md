# Plano do Sistema Admin (SaaS PDV ERP)

Este documento define o que precisa existir no **Sistema Admin** (backoffice do SaaS) para gerenciar **usuários**, **contas/tenants**, **planos**, **assinaturas**, **cobrança** e **observabilidade**.

## Escopo

O Admin é uma área separada do ERP do cliente e deve permitir:

- Gestão de usuários (roles, bloqueio/ativação, reset de senha, etc.)
- Gestão de planos (limites, features, preços, ativos)
- Gestão de assinaturas (status, plano, sincronização com gateway, cancelamento, histórico)
- Observabilidade (eventos, auditoria, métricas de receita, churn)
- Operação (suporte: impersonate, reset, ver logs de erros)

## Estado atual (inventário resumido)

- Frontend em `src/pages/admin`: Dashboard, Users, Plans, Subscriptions, Settings
- Proteção por `AdminRoute` (role `admin`)
- Backend com `requireAdmin` e rotas `/api/admin/*` para stats/analytics/users/plans/subscriptions
- Billing Mercado Pago: checkout e webhook básico

## Objetivo final

Ter um Admin operável em produção, com controles e trilha de auditoria, e assinatura/planos realmente controlando acesso e limites no produto.

## Roadmap

### P0 — Crítico (segurança + integridade)

**P0.1 Logout correto no Admin**

- Ao sair, chamar `/api/auth/logout` e limpar estado do front.

**P0.2 Validação forte (Zod) em endpoints admin**

- `PATCH /api/admin/users/:id/role`
- `POST /api/admin/plans`
- `PUT /api/admin/plans/:id`

Regras:

- `role` somente `user|admin`
- Proibir remover o último admin
- `price_cents` inteiro >= 0
- `max_users/max_products/max_invoices` inteiro >= -1 (onde `-1` significa ilimitado)
- `features_json` sempre array de strings

**P0.3 Corrigir criação de plano**

- Garantir persistência de `description` no create.

### P1 — Admin “operável” (paginação, busca, UX)

**P1.1 Paginação real server-side**

- `GET /api/admin/users?page&pageSize&q`
- `GET /api/admin/plans?page&pageSize&q`
- `GET /api/admin/subscriptions?page&pageSize&q&status`

Retorno padrão:

```json
{ "items": [], "page": 1, "pageSize": 25, "total": 0 }
```

**P1.2 UI: filtros e loading consistentes**

- Busca e paginação usando resposta do backend
- Estado de loading sem “piscar”

### P2 — Billing como controle de acesso

**P2.1 Assinatura obrigatória (quando aplicável)**

- Middleware no backend para exigir assinatura ativa nas rotas do app (com exceções para pagamento/planos).

**P2.2 Enforce limites de plano**

- Bloquear criação de recursos quando exceder limites do plano.

**P2.3 Reconciliação com gateway**

- Salvar status bruto do Mercado Pago e timestamps reais
- Ações no Admin: sincronizar, cancelar, trocar plano

### P3 — Auditoria e suporte

**P3.1 Auditoria persistente**

- Registrar mudanças críticas: role, plano, assinatura

**P3.2 Ferramentas de suporte (opcional)**

- Impersonate (somente superadmin) / reset de senha / logs

## Definições

- **Conta/Tenant**: unidade de dados do cliente.
- **Usuário**: login dentro de um tenant.
- **Plano**: conjunto de preço, features e limites.
- **Assinatura**: relação de um tenant com um plano e um gateway.

