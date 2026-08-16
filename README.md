# TroteBox 0.3.7

> **Riso na linha. Surpresa na caixa.**

Monorepo autoral para uma plataforma de experiências de comédia por telefone, com frontend responsivo, clientes móveis via Capacitor, API própria, carteira de créditos e adaptadores de telefonia/pagamento.

## Nesta versão

- identidade visual TroteBox consolidada;
- wordmark, mascote e ícones separados para responsividade;
- paleta clara com roxo, laranja, amarelo, vermelho/coral e verde;
- modo **preview visual** sem Supabase, Docker, Vercel ou backend;
- frontend Next.js 16 com exportação estática para Capacitor 8;
- API Next.js separada;
- autenticação passwordless por e-mail com OTP de uso único, rate limit e sessão revogável em cookie `HttpOnly`; clientes nativos recebem token apenas quando identificados como `native`;
- timeout e sanitização de erros no cliente HTTP;
- PostgreSQL/Supabase + Prisma;
- ledger transacional de créditos;
- Pix via Mercado Pago no fluxo público; adaptador Stripe preservado no backend para compatibilidade legada;
- Twilio, Vonage ou provedor mock;
- OTP/passwordless, idempotência, rate limit, auditoria e política antiabuso.

## Caminho local adotado

```text
C:\Projetos\trote-box
```

Repositório:

```text
https://github.com/Wpersoli/trotebox.git
```

## 1. Visualizar agora — sem infraestrutura

Requer somente Node.js 22 e npm 10+.

```powershell
cd "C:\Projetos\trote-box"
npm ci
npm run preview:web
```

Abra:

```text
http://127.0.0.1:3000
```

O preview usa dados simulados e permite navegar por HOME com OTP simulado, dashboard, catálogo, novo trote, histórico, créditos e configurações. Não requer banco ou API.

## 2. Stack completa — mais tarde

Quando Supabase/telefonia/pagamentos forem configurados:

```powershell
cd "C:\Projetos\trote-box"
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\setup-local.ps1 -Database supabase -DatabaseUrl $DatabaseUrl -DirectUrl $DirectUrl -SkipInstall
.\scripts\start-local.ps1
```

Em outro PowerShell:

```powershell
cd "C:\Projetos\trote-box"
npm run smoke:local
```

## URLs locais

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api/v1/health`

## Comandos principais

```powershell
npm run preview:web
npm run validate:repo
npm run test:domain
npm run lint
npm run typecheck
npm run test
npm run build
npm run quality
```

`npm run quality` é a validação recomendada antes de commit: valida estrutura, domínio, lint, TypeScript, testes e o build real do frontend sem exigir Supabase. Para uma stack já configurada com banco/API, use `npm run quality:full`.


## Estrutura

```text
apps/
  web/        Next.js + Capacitor + TroteBox UI
  api/        API, auth, pagamentos, telefonia e webhooks
packages/
  contracts/  schemas/tipos compartilhados
  db/         Prisma, migrations, seed e cliente PostgreSQL
scripts/      setup, preview, smoke test e validações
```

## Git

O repositório deve permanecer privado durante o desenvolvimento. Consulte `GIT_FIRST_COMMIT.md` para os comandos exatos do primeiro commit no repositório `Wpersoli/trotebox`.

## Segurança

- nunca publique `.env`, URLs de banco, tokens ou segredos;
- `service_role` do Supabase nunca deve ir para o frontend;
- autenticação de desenvolvimento deve ser desligada em produção;
- gravação permanece desativada por padrão;
- chamadas de emergência, padrões especiais bloqueados e destinos em supressão não devem ser processados;
- o navegador não altera saldo diretamente;
- pagamentos e telefonia são confirmados no backend por eventos assinados/idempotentes.

Consulte `SECURITY.md`, `THREAT_MODEL.md`, `ARCHITECTURE.md` e `DEPLOY.md`.

## Integridade de recovery

Após mudanças versionadas, execute `npm run inventory` e `npm run inventory:verify`. Arquivos `.env*` reais e `next-env.d.ts` são locais/gerados e não entram nos manifests.
