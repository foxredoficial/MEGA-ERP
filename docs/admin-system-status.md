# Status do Sistema Admin (SISFEC ERP ERP)

Atualizado em: 2026-02-13

## Decisão

- Configuração de **chaves/tokens do Mercado Pago** fica por último.
- Código já está preparado para receber as variáveis quando você decidir ativar.

## O que já foi feito

### Segurança e integridade (P0)

- [x] Logout correto no Admin (chama `/api/auth/logout` e limpa sessão)
- [x] Validação e endurecimento dos endpoints Admin (Zod)
- [x] Corrigido `POST /api/admin/plans` para persistir `description`
- [x] Proteção contra remover o último admin ao trocar `role`

### Operação (P1)

- [x] Paginação e busca server-side em `users` / `plans` / `subscriptions`
- [x] UI Admin ajustada para buscar do backend (Users/Subscriptions)

### Qualidade

- [x] `npm run check` / `npm test` / `backend npm run build`

## O que ainda falta (mapeamento)

### Admin UI (prioridade alta)

- [x] Plans: paginação/busca de verdade no UI
- [x] Subscriptions: filtro por status + paginação (UI)
- [ ] Dashboard Admin: filtros de período e estados de loading consistentes
- [ ] Exibir corretamente “status do usuário” (hoje é hardcoded como Ativo)

### Admin API (prioridade alta)

- [ ] Padronizar resposta paginada em todos endpoints (já feito, mas falta ajustar limites/padrões)
- [ ] Auditoria mínima: registrar eventos (troca de role, alteração de plano)
- [ ] Garantir que `features_json` é sempre array válido no banco

### SaaS/Billing (prioridade média/alta)

- [ ] Definir regras de acesso por assinatura (permitir acesso sem pagar? trial? bloqueio?)
- [ ] Implementar middleware `requireActiveSubscription` (com exceções para tela de pagamento)
- [ ] Enforce limites do plano (`max_users`, `max_products`, `max_invoices`) nas rotas de criação

### Suporte e Operação (prioridade média)

- [ ] Ferramentas de suporte (reset de senha, impersonate/suporte)
- [ ] Tela de incidentes/eventos (auditoria e falhas)
