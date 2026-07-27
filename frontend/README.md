# Solução TS — Frontend

Interface web do SaaS de prestação de contas ao Terceiro Setor (Audesp Fase V / TCESP).

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (tema claro/escuro via classe `dark`)
- **React Router** (roteamento) · **lucide-react** (ícones)

## Como rodar (requer Node.js 18+)

```bash
npm install      # instala as dependências
npm run dev      # sobe o servidor de desenvolvimento em http://localhost:5173
```

Outros scripts:

```bash
npm run build    # build de produção (type-check + bundle)
npm run preview  # pré-visualiza o build
```

## Identidade visual

Paleta derivada da logo (`public/logo.png`): **azul da marca** (`brand-*`, base `#4a90d9`) e **grafite** (`ink-*`, base `#2b2f38`), definidas em [tailwind.config.js](tailwind.config.js). Fonte **Inter**.

## Estrutura

```
src/
├── components/
│   ├── layout/    # AppLayout, Sidebar, Topbar (app shell)
│   └── ui/        # Card, Button, Badge, StatCard, PageHeader, ThemeToggle
├── contexts/      # ThemeContext (light/dark + localStorage)
├── lib/           # navigation (menu), cn (merge de classes)
├── pages/         # Dashboard, Ajustes, PrestacaoContas, Tarefas, Placeholder
├── services/      # (a criar) integração Axios com a API
├── App.tsx        # rotas
└── main.tsx       # entrypoint
```

O proxy de dev encaminha `/api` para o backend em `http://localhost:3333` (ver [vite.config.ts](vite.config.ts)).
