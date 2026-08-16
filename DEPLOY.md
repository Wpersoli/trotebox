# Deploy — GitHub + Vercel + Supabase

Repositório:

```text
https://github.com/Wpersoli/trotebox.git
```

## GitHub

Use repositório privado durante o desenvolvimento e mantenha `.env*`, segredos, credenciais de banco, telefonia, e-mail e pagamentos fora do Git.

## Supabase

Use PostgreSQL com pooling:

- `DATABASE_URL` → transaction pooler;
- `DIRECT_URL` → direct/session para migrations.

Produção deve usar projeto separado de desenvolvimento quando o serviço for aberto comercialmente.

## Vercel — API

- Root Directory: `apps/api`
- Framework: Next.js
- Node.js: 22.x
- Install Command: `cd ../.. && npm ci`
- Build Command: `cd ../.. && npm run db:generate && npm run build -w @trotebox/api`

Variáveis obrigatórias incluem `DATABASE_URL`, `DIRECT_URL` quando aplicável, segredos de autenticação/criptografia, URLs públicas, allowlist CORS e credenciais dos provedores ativados.

### OTP por Brevo

Para homologação/produção da 0.3.8:

```text
AUTH_DELIVERY=brevo
BREVO_API_KEY=<segredo>
EMAIL_FROM_NAME=TroteBox
EMAIL_FROM_ADDRESS=<remetente verificado no Brevo>
AUTH_CODE_TTL_MINUTES=7
```

`BREVO_API_KEY` deve existir apenas na Vercel/API ou secret store equivalente. Nunca coloque a chave em `NEXT_PUBLIC_*`, frontend, repositório ou documentação.

Durante testes gratuitos, `EMAIL_FROM_ADDRESS` pode ser um remetente Freemail já verificado no Brevo. Antes da abertura comercial, use domínio próprio autenticado com DKIM/DMARC.

## Vercel — Web

- Root Directory: `apps/web`
- Install Command: `cd ../.. && npm ci`
- Build Command: `cd ../.. && npm run build -w @trotebox/web`
- Output Directory: `out`

Variáveis públicas recomendadas:

```text
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_PREVIEW_MODE=false
NEXT_PUBLIC_ENABLE_DEV_LOGIN=false
NEXT_PUBLIC_AUTH_MODE=passwordless
NEXT_PUBLIC_APP_NAME=TroteBox
NEXT_PUBLIC_COMMERCE_MODE=web
```

Para `NEXT_PUBLIC_CLIENT_PLATFORM=web`, build de produção usa `/api/v1` quando `NEXT_PUBLIC_API_BASE_URL` estiver vazio/ausente. O `apps/web/vercel.json` encaminha essa rota, sem alterar a URL no navegador, para:

```text
https://trotebox-api.vercel.app/api/v1/:path*
```

Isso mantém requests e cookie de sessão no mesmo host público do Web durante a homologação gratuita. Em desenvolvimento local, o fallback continua `http://localhost:3001/api/v1`.

Se futuramente o backend Web mudar de destino, atualize a `destination` do rewrite. Para builds nativos, defina `NEXT_PUBLIC_API_BASE_URL` com a URL direta da API.

`apps/web/vercel.json` também aplica headers de segurança no hosting web sem retirar `output: "export"`, necessário ao fluxo Capacitor.

## Sessão web

A API define cookie `trotebox_session` com `HttpOnly`, `SameSite=Lax`, `Secure` em produção e `Path=/`. O cliente usa `credentials: "include"`.

Na 0.3.8, o navegador chama `/api/v1/*` no próprio domínio Web e a Vercel atua como reverse proxy para o projeto API. Isso evita depender de cookie de terceiro entre dois projetos `*.vercel.app` independentes.

Quando houver domínio próprio, prefira manter Web e API no mesmo site registrável, por exemplo `trotebox.com.br` e `api.trotebox.com.br`, ou continue usando proxy same-origin.

Não troque `SameSite=Lax` por `None` apenas para contornar domínio mal configurado; isso amplia a superfície de CSRF e depende de políticas de cookies de terceiros.

Para aplicativo nativo, o endpoint pode devolver token somente quando `X-Client-Platform: native` for informado; armazenamento seguro nativo deve ser usado antes da publicação mobile.

## Banco — estado herdado da 0.3.7

A migration `20260815213000_revocable_sessions` continua obrigatória para a arquitetura atual. Se ela já foi aplicada no Supabase, a 0.3.8 **não adiciona migration de banco**.

Para ambiente novo:

```powershell
npm ci
npm run db:generate
npm run db:deploy
npm run quality:release
```

Se `db:deploy` acusar violação de constraint em dado histórico, interrompa e audite o registro; não remova a constraint para forçar a publicação.

## Ordem de publicação da 0.3.8

1. Garanta que a migration 0.3.7 já esteja aplicada.
2. Configure as variáveis Brevo no projeto `trotebox-api`.
3. Confirme `ALLOWED_ORIGINS` com a origem Web HTTPS atual.
4. Execute `npm ci`, `npm audit --omit=dev` e `npm run quality:release`.
5. Faça commit/push.
6. Espere Web e API ficarem `Ready` no mesmo commit.
7. Teste `/api/v1/health` pelo domínio Web e depois faça o smoke OTP completo.
8. Só depois valide pagamentos sandbox/real conforme a fase do projeto.

## Webhooks

- Stripe: `/api/v1/webhooks/stripe`
- Mercado Pago: `/api/v1/webhooks/mercadopago`
- Twilio: rotas sob `/api/v1/webhooks/twilio/*`
- Vonage: rotas sob `/api/v1/webhooks/vonage/*`

Configure URLs finais HTTPS no painel de cada provedor e valide assinatura/idempotência.
