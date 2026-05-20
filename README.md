# Plataforma Operacional

Plataforma fullstack modular para relatorios, operacoes, automacao e gestao multiempresa.

## Stack

- Next.js App Router, TypeScript e TailwindCSS
- Supabase Auth, PostgreSQL, RLS e Storage-ready
- Google Calendar via OAuth e Calendar REST API
- Vercel, GitHub, Sentry e UptimeRobot preparados por variaveis de ambiente

## Primeira entrega

- Base Next.js criada com estrutura `/app`, `/components`, `/modules`, `/services`, `/hooks`, `/types`, `/lib` e `/styles`
- Modulos reservados: Instagram, Financeiro, Atividades, Agenda, Relatorios e Admin
- Modulo Agenda implementado como primeiro fluxo funcional
- Supabase SSR Auth configurado com cookie-based sessions
- Migration inicial com tenants, RBAC, permissoes por modulo, agenda, Google Calendar connections e logs
- UI responsiva com paleta `#9D6F4E`, `#0D3A4E`, `#F4F1EA`, `#E2D0B8` e logo da profissional

## Ambientes

Copie `.env.example` para `.env.local` no ambiente DEV e preencha:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

Use variaveis separadas na Vercel para HML e PRD.

## Banco

A migration inicial esta em:

```bash
supabase/migrations/0001_initial_platform.sql
```

Ela ativa RLS em todas as tabelas expostas e usa funcoes auxiliares no schema `app_private` para validar tenant, role e acesso ao modulo.

## Desenvolvimento

```bash
npm install
npm run dev
npm run build
```

Fluxo Git recomendado:

```bash
feature/* -> develop -> main
```
