# Solução TS

SaaS para prestação de contas de repasses ao **Terceiro Setor** (Audesp Fase V / TCESP).
Monorepo com **frontend** (React + Vite + TypeScript + Tailwind) e **backend** (Node.js + Express + TypeScript + Prisma + PostgreSQL).

```
SolucaoTS/
├── frontend/   # React + Vite (interface)
├── backend/    # Express + Prisma (API)
└── Documentação/
```

## Pré-requisitos
- **Node.js 18+**
- **PostgreSQL** (local, Docker, ou um serviço na nuvem como Neon)

---

## Rodar localmente

### 1) Backend
```bash
cd backend
cp .env.example .env          # ajuste DATABASE_URL e JWT_SECRET
npm install
npx prisma generate
npx prisma db push            # cria as tabelas no banco
npm run dev                   # http://localhost:3333/api
```

### 2) Frontend
```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```
Em desenvolvimento o Vite encaminha `/api` para `http://localhost:3333` (ver `vite.config.ts`).

> Sem backend, a tela de login tem um botão **"Entrar em modo demonstração"** (apenas em dev) para explorar a interface.

---

## Publicar online (deploy)

Arquitetura sugerida (planos gratuitos): **Postgres na [Neon](https://neon.tech)** · **backend no [Render](https://render.com)** · **frontend na [Vercel](https://vercel.com)**.

### Passo 1 — Banco de dados (Neon)
1. Crie um projeto e copie a **connection string** (formato `postgresql://...`).

### Passo 2 — Backend (Render → New Web Service)
- **Root Directory:** `backend`
- **Build Command:** `npm install && npx prisma generate && npx prisma db push`
- **Start Command:** `npm start`
- **Environment Variables:**
  | Variável | Valor |
  |---|---|
  | `DATABASE_URL` | connection string da Neon |
  | `JWT_SECRET` | um segredo longo e aleatório |
  | `APP_URL` | URL do frontend (ex.: `https://seu-app.vercel.app`) |
  | `CORS_ORIGIN` | URL do frontend (mesmo valor de `APP_URL`) |
  | `NODE_ENV` | `production` |
- Anote a URL pública gerada (ex.: `https://solucaots-api.onrender.com`).

### Passo 3 — Frontend (Vercel → Import Project)
- **Root Directory:** `frontend`
- **Environment Variable:** `VITE_API_URL` = `https://SEU-BACKEND.onrender.com/api`
- O `vercel.json` já cuida do roteamento das páginas (SPA).

### Passo 4 — Fechar o CORS
Depois que a Vercel gerar a URL do frontend, confirme que `CORS_ORIGIN` e `APP_URL` no Render apontam para ela e faça um redeploy do backend.

### Passo 5 — Criar o primeiro usuário
O app exige login. Crie um usuário pela tela **Usuários** (é preciso estar logado) — ou, para o primeiro acesso, use um cliente de API para chamar `POST /api/usuarios` com os dados + senha, e então faça login.

> **Observações:** no plano gratuito do Render o serviço "dorme" após inatividade (primeiro acesso demora alguns segundos) e o disco é efêmero — **logotipos enviados podem se perder** em reinícios (para persistir, use um bucket como S3). Suficiente para demonstração.

---

## Scripts úteis
**Backend:** `npm run dev` · `npm start` · `npm run typecheck` · `npm run db:push` · `npm run prisma:studio`
**Frontend:** `npm run dev` · `npm run build` · `npm run preview`
