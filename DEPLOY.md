# Deploy — GitHub + Vercel + Supabase

Repositório:

```text
https://github.com/Wpersoli/trotebox.git
```

## GitHub

Use repositório privado durante o desenvolvimento e mantenha `.env*`, segredos, credenciais de banco, telefonia e pagamentos fora do Git.

## Supabase

Use PostgreSQL com pooling:

- `DATABASE_URL` → transaction pooler;
- `DIRECT_URL` → direct/session para migrations.

Produção deve usar projeto separado de desenvolvimento.

## Vercel — API

- Root Directory: `apps/api`
- Framework: Next.js
- Node.js: 22.x
- Install Command: `cd ../.. && npm install`
- Build Command: `cd ../.. && npm run db:generate && npm run build -w @trotebox/api`

Variáveis obrigatórias incluem `DATABASE_URL`, `DIRECT_URL` quando aplicável, segredos de autenticação/criptografia, URLs públicas, allowlist CORS e credenciais dos provedores ativados.

## Vercel — Web

- Root Directory: `apps/web`
- Install Command: `cd ../.. && npm install`
- Build Command: `cd ../.. && npm run build -w @trotebox/web`
- Output Directory: `out`

Variáveis públicas:

```text
NEXT_PUBLIC_API_BASE_URL=https://api.seudominio.com/api/v1
NEXT_PUBLIC_PREVIEW_MODE=false
NEXT_PUBLIC_ENABLE_DEV_LOGIN=false
NEXT_PUBLIC_AUTH_MODE=passwordless
NEXT_PUBLIC_APP_NAME=TroteBox
NEXT_PUBLIC_COMMERCE_MODE=web
```

`apps/web/vercel.json` aplica headers de segurança no hosting web sem retirar `output: "export"`, necessário ao fluxo Capacitor.

## Sessão web

A API define cookie `trotebox_session` com `HttpOnly`, `SameSite=Lax` e `Secure` em produção. O cliente usa `credentials: "include"`. Para aplicativo nativo, o endpoint pode devolver token somente quando `X-Client-Platform: native` for informado; armazenamento seguro nativo deve ser usado antes da publicação mobile.

## Webhooks

- Stripe: `/api/v1/webhooks/stripe`
- Mercado Pago: `/api/v1/webhooks/mercadopago`
- Twilio: rotas sob `/api/v1/webhooks/twilio/*`
- Vonage: rotas sob `/api/v1/webhooks/vonage/*`

Configure URLs finais HTTPS no painel de cada provedor e valide assinatura/idempotência.
