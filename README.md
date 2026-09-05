# TroteBox

Monorepo autoral para uma plataforma de experiências de comédia por telefone, com controles de consentimento, créditos e política antiabuso desde a criação do pedido.

## Stack

- Next.js 16 no frontend web responsivo e cliente mobile via Capacitor;
- API Node.js/Next.js com TypeScript e Zod;
- PostgreSQL/Supabase com Prisma;
- créditos transacionais com ledger;
- Pix via Mercado Pago e compatibilidade legada com Stripe;
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

O preview usa dados simulados e permite navegar pela HOME com OTP simulado, dashboard, catálogo, novo trote, histórico, créditos e configurações. Não requer banco ou API.

### Stack completa — quando a infraestrutura estiver configurada

```powershell
.\scripts\setup-local.ps1 -Database supabase -DatabaseUrl $DatabaseUrl -DirectUrl $DirectUrl -SkipInstall
.\scripts\start-local.ps1
```

Em outro terminal:

```powershell
npm run smoke:local
```

URLs padrão:

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api/v1/health`

## Qualidade

```powershell
npm run quality
```

`npm run quality` é a validação recomendada antes de commit: valida estrutura, domínio, lint, TypeScript, testes e o build real do frontend sem exigir Supabase. Para uma stack já configurada com banco/API, use `npm run quality:full`.

## Estrutura

```text
apps/         web + api
packages/     contracts + db
scripts/      setup, preview, smoke test e validações
```

## Repositório

O código-fonte é público para inspeção e colaboração. Segredos, ambientes de produção, bancos, tokens e credenciais permanecem fora do repositório.

## Segurança

- nunca commitar segredos reais;
- `service_role` apenas no backend quando aplicável;
- autenticação de desenvolvimento bloqueada em produção;
- gravação desativada por padrão e condicionada a consentimento específico;
- destinos de emergência e outros destinos restritos são bloqueados;
- números em supressão não podem ser contatados;
- limites por usuário e por destinatário protegem o uso do serviço;
- callbacks de provedores são validados antes do processamento;
- créditos são reservados e capturados/liberados transacionalmente;
- seeds são destinados a desenvolvimento/homologação e recusam execução com `NODE_ENV=production`;
- respostas públicas cacheáveis não recebem dados de usuário nem credenciais.

O serviço não deve ser usado para ameaça, perseguição, fraude, impersonação ou assédio.
