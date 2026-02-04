# MEGA ERP — Site do SaaS (Frontend)

Frontend do MEGA ERP com:
- Landing page (`/`)
- Planos (`/planos`)
- Cadastro/Login/Recuperação (`/auth`)
- Área do cliente protegida (`/app`)
- Termos (`/termos`) e Privacidade (`/privacidade`)

## Requisitos
- Node.js 18+
- Backend do MEGA ERP expondo as rotas HTTP em `/api` (MySQL + autenticação + Mercado Pago)

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

## Rodar localmente
### Backend (API)
1) Crie o arquivo `backend/.env` usando `backend/.env.example`.
2) Aplique o schema do MySQL: `backend/schema.sql`.
3) Rode:

```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
npm install
npm run dev
```

## Qualidade
```bash
npm run lint
npm run check
npm run test
```
