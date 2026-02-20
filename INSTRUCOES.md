# Guia de Inicialização do SISFEC

Este guia descreve o passo a passo para configurar e rodar todo o ecossistema do projeto (Backend, Frontend do Cliente e Painel Administrativo).

---

## ⚡ Início Rápido (Dia a Dia)

Se você já instalou as dependências anteriormente, basta abrir **3 terminais** e rodar os comandos abaixo para iniciar o projeto rapidamente:

### 1. Backend (Terminal 1)
```bash
cd backend
npm run dev
```

### 2. Frontend (Terminal 2)
```bash
# Na pasta raiz
npm run dev
```

### 3. Painel Admin (Terminal 3)
```bash
cd admin
npm run dev
```

---

## 🛠️ Instalação Completa (Primeira Vez ou Reinstalação)

Se é a primeira vez que você está rodando o projeto ou precisa reinstalar dependências, siga os passos abaixo.

### 📋 Pré-requisitos

1.  **Node.js** (Versão 18 ou superior)
2.  **MySQL** (Rodando e acessível)
3.  **Git** (Opcional, para versionamento)

---

### 🚀 Passo 1: Configuração do Backend (API)

O Backend é o coração do sistema. Ele deve ser o primeiro a ser iniciado.

1.  Abra um terminal e navegue até a pasta `backend`:
    ```bash
    cd backend
    ```

2.  Instale as dependências:
    ```bash
    npm install
    ```

3.  Configure o banco de dados:
    -   Certifique-se que o MySQL está rodando.
    -   Crie um arquivo `.env` na pasta `backend` (baseado no `.env.example`) com as credenciais do banco.
    -   Rode o script de criação das tabelas (se for a primeira vez):
        ```bash
        mysql -u seu_usuario -p < schema.sql
        ```
        *(Ou execute o conteúdo de `schema.sql` no seu gerenciador de banco de dados preferido, como Workbench ou DBeaver).*

4.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
    ✅ **Sucesso:** Você verá `SISFEC API rodando em http://localhost:3000`.

---

### 💻 Passo 2: Frontend (Área do Cliente e Landing Page)

Este é o site principal e o sistema que os clientes finais usarão.

1.  Abra um **segundo terminal** na raiz do projeto (`SISFEC ERP ERP`):
    ```bash
    # Se estiver na pasta backend, volte um nível: cd ..
    ```

2.  Instale as dependências:
    ```bash
    npm install
    ```

3.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
    ✅ **Sucesso:** O sistema estará acessível em `http://localhost:5173`.


## 🔗 Resumo de Acesso

Com os 3 terminais rodando simultaneamente:

| Sistema | URL | Descrição |
| :--- | :--- | :--- |
| **Backend (API)** | `http://localhost:3000` | API REST e Banco de Dados |
| **Frontend (Cliente)** | `http://localhost:5173` | Landing Page, Login e App do Cliente |
| **Painel Admin** | `http://localhost:5175` | Gestão do SaaS (Super Admin) |

> **Nota:** Mantenha os 3 terminais abertos enquanto estiver desenvolvendo. Se fechar o terminal do Backend, os outros sistemas darão erro de conexão.
