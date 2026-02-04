# Page Design — MEGA ERP (Desktop-first)

## Global Styles (tokens e padrões)
- Layout base: container central com largura máx. 1120–1200px; grid de 12 colunas; espaçamentos em escala 4/8/12/16/24/32/48.
- Cores (exemplo):
  - Background: #0B1220 (escuro) ou #FFFFFF (claro) — escolher 1 tema e manter consistente.
  - Primary: #3B82F6; Primary hover: #2563EB; Accent: #22C55E; Text: #0F172A / #E5E7EB.
  - Bordas: #E2E8F0; Cards: fundo neutro + sombra leve.
- Tipografia: Inter (ou system-ui); escala: 14/16/20/24/32/40; headings com peso 600–700.
- Botões:
  - Primário: preenchido (primary), raio 10–12px, altura 44px.
  - Secundário: contorno (border), hover com leve preenchimento.
  - Estados: disabled com opacidade 0.5; loading com spinner inline.
- Links: sublinhado no hover; cor primary.
- Formulários: inputs altura 44px; mensagens de erro abaixo do campo; validação em tempo real ao sair do campo (onBlur).
- Responsivo (mínimo necessário):
  - >= 1024px: desktop (layout principal).
  - < 1024px: empilhar seções; menu vira drawer.

---

## 1) Landing page (/)

### Layout
- Sistema: CSS Grid (seções em coluna) + Flexbox (alinhamentos internos).
- Header sticky opcional (desktop) com sombra suave ao scroll.

### Meta Information
- Title: “MEGA ERP — ERP SaaS para sua operação”
- Description: “Centralize gestão e dados em um painel simples. Compare planos e comece agora.”
- Open Graph: título/descrição + imagem de capa (mock do dashboard).

### Page Structure
1. Header (nav)
2. Hero
3. Benefícios (3–6 cards)
4. Prova social (logos/depoimentos curtos)
5. FAQ resumido
6. CTA final
7. Footer

### Sections & Components
- Header
  - Logo (esquerda)
  - Links: “Planos”, “Entrar”
  - CTA: “Criar conta” (botão primário)
- Hero
  - H1 (promessa), parágrafo, 2 CTAs: “Ver planos” (primário) e “Entrar” (secundário)
  - Ilustração/screenshot do produto (card à direita)
- Benefícios
  - Grid 3 colunas (desktop) com ícone + título + texto curto
- Prova social
  - Faixa com logos (cinza) e 1–2 depoimentos em cards
- FAQ
  - Accordion com 4–6 perguntas essenciais
- CTA final
  - Card destacado com texto e botão “Começar agora” levando para /planos
- Footer
  - Links: Termos/Privacidade (se existirem), contato básico

---

## 2) Página de planos (/planos)

### Layout
- Top section com título e subtítulo; abaixo, cards de plano em grid.

### Meta Information
- Title: “Planos — MEGA ERP”
- Description: “Compare recursos e escolha o plano ideal para começar.”
- Open Graph: título/descrição.

### Page Structure
1. Header (igual landing)
2. Título + texto de apoio
3. Cards de planos
4. Tabela de comparação (opcional, mas recomendada no desktop)
5. FAQ curto (2–3 itens) + CTA

### Sections & Components
- Cards de planos
  - Nome do plano, preço mensal, lista de recursos (bullets)
  - Badge “Recomendado” (quando is_featured=true)
  - Botão “Escolher plano”
  - Interação: ao escolher, salvar planId selecionado (state/param). Se não autenticado, redirecionar para /auth; se autenticado, iniciar checkout Mercado Pago.
- Comparação
  - Tabela com linhas de recursos e colunas de planos (fácil de escanear)

---

## 3) Cadastro/Login (/auth)

### Layout
- Layout centralizado (card) com largura 420–480px; fundo neutro.
- Tabs ou switch: “Entrar” e “Criar conta”.

### Meta Information
- Title: “Acessar — MEGA ERP”
- Description: “Entre ou crie sua conta para acessar a área do cliente.”
- Open Graph: básico.

### Page Structure
1. Header minimal (logo + link “Voltar”)
2. Card de autenticação

### Sections & Components
- Card (Auth)
  - Título dinâmico (Entrar/Criar conta)
  - Campos:
    - Email
    - Senha
    - (Cadastro) Confirmar senha (se adotado)
  - Checkbox “Aceito os termos” (cadastro)
  - Botão primário (submit) + estado loading
  - Link “Esqueci minha senha” (abre modo recuperação)
- Recuperação de senha
  - Campo email + botão “Enviar link”
  - Mensagem de sucesso/erro
- Comportamentos
  - Se existir plano pré-selecionado, exibir um pequeno resumo no topo do card (plano obtido via API usando planId) e manter após login/cadastro.
  - Após sucesso: redirecionar para /app.

---

## 4) Área do cliente (/app)

### Layout
- Estrutura: dashboard com sidebar esquerda (240px) + conteúdo à direita.
- Desktop-first; no mobile, sidebar vira drawer.

### Meta Information
- Title: “Área do Cliente — MEGA ERP”
- Description: “Gerencie seu perfil e seu plano.”
- Open Graph: não essencial.

### Page Structure
1. Topbar (no conteúdo) com saudação e menu de conta
2. Visão geral (cards)
3. Seção Perfil
4. Seção Plano

### Sections & Components
- Proteção de rota
  - Se não autenticado: redirecionar para /auth
- Sidebar
  - Itens: “Visão geral”, “Perfil”, “Plano”
  - Botão “Sair” (logout)
- Visão geral
  - Cards: “Plano atual”, “Status da conta”, “Atalhos”
- Perfil
  - Form com nome e empresa; botão “Salvar”
  - Feedback: toast/alert de sucesso/erro
- Plano
  - Card mostrando plano atual + botão “Trocar plano” levando para /planos
  - Status textual (ex.: active
