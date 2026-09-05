# TroteBox 0.3.9

> **Riso na linha. Surpresa na caixa.**

Monorepo autoral para uma plataforma de experiências de comédia por telefone, com frontend responsivo, clientes móveis via Capacitor, API própria, carteira de créditos e adaptadores de telefonia/pagamento.

## Nesta versão

- identidade visual TroteBox consolidada;
- wordmark, mascote e ícones separados para responsividade;
- paleta clara com roxo, laranja, amarelo, vermelho/coral e verde;
- modo **preview visual** sem Supabase, Docker, Vercel ou backend;
- frontend Next.js 16 com exportação estática para Capacitor 8;
- API Next.js separada;
- autenticação passwordless por e-mail com OTP de uso único entregue pela Brevo, rate limit e sessão revogável em cookie `HttpOnly`; clientes nativos recebem token apenas quando identificados como `native`;
- timeout e sanitização de erros no cliente HTTP; em produção Web, `/api/v1` é encaminhado pela Vercel ao projeto da API para manter a sessão same-origin durante homologação sem domínio próprio;
- PostgreSQL/Supabase + Prisma;
- ledger transacional de créditos;
- Pix via Mercado Pago no fluxo público; adaptador Stripe preservado no backend para compatibilidade legada;
- Twilio ou Vonage em produção; provedor mock somente em desenvolvimento/preview;
- OTP/passwordless, idempotência, rate limit, auditoria e política antiabuso.

## Desenvolvimento local

Requer Node.js 22 e npm 10+.

### Visualizar agora — sem infraestrutura

```powershell
npm ci
npm run preview:web
```

Abra `http://127.0.0.1:3000`.

O preview usa dados simulados e permite navegar por HOME com OTP simulado, dashboard, catálogo, novo trote, histórico, créditos e configurações. Não requer banco ou API.

### Stack completa — quando a infraestrutura estiver configurada

```powershell
.\scripts\setup-local.ps1 -Database supabase -DatabaseUrl $DatabaseUrl -DirectUrl $DirectUrl -SkipInstall
.\scripts\start-local.ps1
```

Em outro terminal:

```powershell
npm run smoke:local
```

## URLs padrão

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

## Repositório

O código-fonte é público para inspeção e colaboração. Segredos, ambientes de produção, bancos, tokens e credenciais permanecem fora do repositório.

## Segurança

- nunca publique `.env`, URLs de banco, tokens ou segredos;
- `service_role` do Supabase nunca deve ir para o frontend;
- autenticação de desenvolvimento deve ser desligada em produção;
- gravação permanece desativada por padrão e só é habilitada com consentimento específico;
- chamadas de emergência, padrões especiais bloqueados e destinos em supressão não devem ser processados;
- o navegador não altera saldo diretamente;
- pagamentos e telefonia são confirmados no backend por eventos assinados/idempotentes;
- callbacks e gravações usam allowlists de origem e não devem seguir redirecionamentos inesperados;
- dados desnecessários de webhooks não são persistidos como payload bruto;
- limites de tamanho de requisição reduzem abuso e consumo desnecessário de recursos;
- idempotência de chamadas é protegida também contra concorrência no banco;
- `db:seed` é destinado a desenvolvimento/homologação e recusa execução quando `NODE_ENV=production`.

Consulte `SECURITY.md`, `THREAT_MODEL.md`, `ARCHITECTURE.md` e `DEPLOY.md`.

## Integridade de recovery

Após mudanças versionadas, execute `npm run inventory` e `npm run inventory:verify`. Arquivos `.env*` reais e `next-env.d.ts` são locais/gerados e não entram nos manifests.

## Catálogo público

A página inicial apresenta experiências, preços, FAQ, práticas de segurança e orientação para bloqueio do próprio número. Exemplos em áudio só devem ser publicados depois da revisão e aprovação dos arquivos de demonstração.

O serviço não deve ser usado para ameaça, perseguição, fraude, impersonação ou assédio.
