# MEGA ERP — SaaS PDV / ERP (Full Stack)

Monorepo do **MEGA ERP** (SaaS), com **Frontend** (site + app do cliente + admin) e **Backend** (API + MySQL + integrações).

## O que existe no projeto

### Frontend (React)
- Site público: Landing (`/`), Planos (`/planos`), Auth (`/auth`), Termos (`/termos`) e Privacidade (`/privacidade`).
- App do cliente: área protegida (`/app`) com módulos de Produtos, Serviços, Contatos, Vendas, PDV, Ordens de Serviço, Financeiro, Estoque, Documentos e Relatórios.
- Admin do SaaS: painel em rota (`/admin`) dentro do mesmo frontend.

### Backend (API)
- API REST com autenticação via cookies (sessão) + proteção CSRF.
- Persistência em **MySQL**, com:
  - Banco “SaaS” (usuários, planos, assinaturas, tokens, eventos, webhooks).
  - Banco “tenant” por usuário (dados do ERP), criado sob demanda.
- Integrações: **Mercado Pago** (assinaturas + webhook), **Google OAuth**, e **Emissão fiscal** via serviço externo (MEGA NFE).

## Planos, assinaturas e recursos (Entitlements)

O projeto separa:

- **Benefícios do plano (exibição)**: textos/itens livres que aparecem na landing de planos.
- **Recursos do SaaS (controle de acesso)**: chaves funcionais que determinam o que aparece no menu do cliente e quais endpoints são permitidos.

### Como funciona

- No **Admin → Planos**, você marca os recursos do SaaS por checkbox.
- No **App do cliente**, o menu e algumas rotas ficam protegidas:
  - recurso não liberado não aparece no menu;
  - se tentar acessar por URL, aparece uma tela de bloqueio (“Recurso não disponível no seu plano”).
- No **Backend**, existe um middleware que pode bloquear APIs por assinatura ativa/feature/limites.

### Chaves de recursos do SaaS

Exemplos (podem evoluir): `products`, `contacts`, `services`, `salespersons`, `categories`, `price_lists`, `sales_orders`, `docs`, `pdv`, `service_orders`, `stock`, `finance`, `banks`, `cash`, `reports`.

### Ativar bloqueio real no backend

Por padrão, o enforcement fica desligado (para facilitar desenvolvimento). Para ativar:

```bash
BILLING_ENFORCE_SUBSCRIPTION=true
```

## Stack

- Frontend: React + TypeScript + Vite + React Router + Zustand + TailwindCSS.
- Backend: Node.js + TypeScript + Express.
- Banco: MySQL (`mysql2/promise`).

## Estrutura do repositório

- `src/`: Frontend (páginas, componentes, rotas).
- `backend/`: Backend (API, rotas, repositórios e schemas SQL).
- `backend/schema.sql`: tabelas do banco “SaaS”.
- `backend/tenant_schema.sql`: tabelas do banco “tenant” (ERP).

## Requisitos

- Node.js 18+
- MySQL rodando e acessível

## Backend
O backend fica em [backend/](file:///c:/Users/User/Desktop/SaaS%20PDV%20ERP/backend) e roda em `http://localhost:3000` por padrão.
Para habilitar login com Google (OAuth), configure no `backend/.env`:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## Configuração
Crie um `.env` (ou `.env.local`) com:

```bash
VITE_API_BASE_URL=
```

`VITE_API_BASE_URL` pode ficar vazio quando o frontend e o backend estiverem no mesmo domínio/porta. Caso contrário, use a URL do backend (ex.: `http://localhost:3000`).

O `vite.config.ts` já faz proxy de `/api` para `http://localhost:3000` no ambiente de desenvolvimento.

## Variáveis de ambiente (Backend)

Copie `backend/.env.example` para `backend/.env` e ajuste:

- `SESSION_JWT_SECRET`: segredo forte para assinar a sessão.
- `MYSQL_*`: credenciais do MySQL.
- `MP_ACCESS_TOKEN`: token do Mercado Pago.
- `MP_WEBHOOK_SIGNATURE_SECRET`: segredo (opcional) para validar assinatura do webhook.
- `BILLING_ENFORCE_SUBSCRIPTION`: ativa bloqueio de rotas por assinatura/recursos.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI`: OAuth Google (opcional).
- `MEGA_NFE_API_URL` / `MEGA_NFE_API_KEY`: emissão fiscal (opcional, servidor).

## Banco de dados

### Banco “SaaS”

- Crie um database (ex.: `megaerp`) e aplique o schema em `backend/schema.sql`.

### Banco “tenant” (por usuário)

- Cada usuário usa um database separado no padrão `megaerp_tenant_<uuid>` (UUID com hífens substituídos por `_`).
- A criação e aplicação de `backend/tenant_schema.sql` acontece sob demanda quando o tenant é acessado pela primeira vez.
- Existe um seed para popular dados de demonstração:

```bash
cd backend
npm run db:seed -- --email <email>
```

## Rodar localmente

### Backend (API)
1) Crie `backend/.env` usando `backend/.env.example`.
2) Crie o database do MySQL e aplique `backend/schema.sql`.
3) Rode:

```bash
cd backend
npm install
npm run dev
```

### Frontend (site + app + admin)

```bash
npm install
npm run dev
```

Frontend (dev): `http://localhost:5173`

## Scripts

### Frontend (raiz)
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run check`
- `npm run test`

### Backend (`backend/`)
- `npm run dev`
- `npm run build`
- `npm start`
- `npm run db:seed`

## Rotas esperadas no backend
O frontend consome as seguintes rotas:

- `GET /api/public/plans` → `{ plans: Plan[] }`
- `POST /api/auth/register` → cria conta e inicia sessão (cookie)
- `POST /api/auth/login` → inicia sessão (cookie)
- `POST /api/auth/logout` → encerra sessão
- `GET /api/auth/me` → sessão e perfil
- `GET /api/auth/google/start` → inicia OAuth Google (redirect)
- `GET /api/auth/google/callback` → callback OAuth Google (redirect)
- `POST /api/auth/password/forgot` → envia recuperação de senha
- `PUT /api/me/profile` → atualiza perfil
- `GET /api/me/subscription` → assinatura atual (ou `null`)
- `POST /api/billing/checkout` → retorna `initPoint` do Mercado Pago
- `POST /api/billing/subscription/sync` → sincroniza status com Mercado Pago (quando configurado)
- `POST /api/billing/subscription/cancel` → cancela assinatura no Mercado Pago (quando configurado)

Além disso, o backend expõe rotas por domínio (ex.: produtos, contatos, vendas, PDV, financeiro, bancos, estoque, documentos e relatórios) sob o namespace `/api`.

## Segurança (visão geral)

- Sessão via cookie `httpOnly` assinado (JWT) e `credentials: "include"` no frontend.
- Token CSRF em cookie separado (`csrf_token`) e header `x-csrf-token` em métodos mutáveis.

## Padrões de UI (moeda)

Para valores monetários, o projeto padroniza um input de moeda pt-BR em:

- `src/components/ui/MoneyInput.tsx`

Ele formata em “estilo maquininha” (2 casas decimais, separador de milhar e vírgula) e emite valor numérico arredondado para 2 casas via `onValueChange`.

## Qualidade
```bash
npm run lint
npm run check
npm run test
```

## Notas

- Existe um guia adicional em `INSTRUCOES.md`, mas ele pode conter referências antigas (ex.: pasta `admin/` separada). O painel admin atualmente está dentro do mesmo frontend na rota `/admin`.
- Status do Admin e mapeamento do que falta: `docs/admin-system-status.md`.
