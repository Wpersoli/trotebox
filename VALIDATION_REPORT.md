# Relatório de validação — TroteBox 0.3.8

Data: 16 de agosto de 2026.
Baseline recebido: `ff8403f` (`main`) — `feat: release TroteBox v0.3.7 passwordless e hardening financeiro`.

## Veredito deste pacote

**APROVADO como fonte TroteBox 0.3.8 sanitizado para revalidação final no Windows e deploy controlado.**

A release preserva banco, sessões revogáveis, ledger e pagamentos da 0.3.7. Não existe migration nova. O escopo funcional novo é a troca do transporte de OTP para Brevo e o proxy same-origin do Web para a API na Vercel.

A aprovação acima não afirma envio real de e-mail, pois a `BREVO_API_KEY` do usuário não foi fornecida ao pacote/sandbox e deve permanecer secreta. O smoke real do OTP deve ser feito somente após configurar a chave diretamente na Vercel.

## Escopo alterado

- remove integração de runtime com Resend (`RESEND_API_KEY`, `EMAIL_FROM`, `api.resend.com`);
- adiciona `AUTH_DELIVERY=brevo`, `BREVO_API_KEY`, `EMAIL_FROM_NAME` e `EMAIL_FROM_ADDRESS`;
- isola entrega transacional em `apps/api/src/server/email-delivery.ts`;
- mantém código OTP de 6 dígitos, TTL 7 min, uso único, máximo 5 tentativas, cooldown 60 s, invalidação no reenvio e rate limit;
- adiciona tratamento de timeout/rede da Brevo e erro 502 sanitizado;
- adiciona teste de payload transacional e testes das novas variáveis de ambiente;
- Web em produção pode usar `/api/v1` no próprio host; `apps/web/vercel.json` encaminha para `https://trotebox-api.vercel.app/api/v1/*`;
- mantém fallback local para `http://localhost:3001/api/v1` quando a URL pública não é definida;
- nenhuma dependência externa foi adicionada, removida ou atualizada;
- nenhuma migration foi adicionada.

## Validações executadas neste ambiente

- `npm run validate:repo`: aprovado — 23 arquivos obrigatórios, 13 JSONs, 5 packages 0.3.8, 68 fontes, 22 rotas/OpenAPI, 17 modelos Prisma e 6 enums;
- `npm run inventory` / `npm run inventory:verify`: aprovados após regeneração final;
- `npm run test:domain`: **7/7**;
- `npm run lint`: aprovado nos quatro workspaces;
- TypeScript direto (`tsc --noEmit`) em contracts, db, API e Web: aprovado;
- `git diff --check`: sem erro de whitespace; somente aviso esperado de normalização LF/CRLF do script PowerShell;
- grafo de dependências externas do `package-lock.json`: **0 adições, 0 remoções, 0 mudanças de versão** em relação à 0.3.7;
- `nanoid`: permanece em **3.3.18** no lockfile;
- varredura por reutilização exata de valores sensíveis dos `.env` locais em arquivos distribuíveis: **0 ocorrências**;
- varredura por padrões de Brevo/GitHub/Stripe/AWS/private key: **0 ocorrências**;
- validador passou a bloquear chave Brevo com padrão `xkeysib-*`, variáveis legadas do Resend e ausência do rewrite same-origin.

## Limite técnico do sandbox

O ZIP recebido contém `node_modules` instalado no Windows. Neste ambiente Linux faltam os binários opcionais Linux de Next/SWC, Rollup e esbuild. A rede direta do sandbox não permite reinstalar esses opcionais.

Por isso, `next typegen`, Vitest e `next build` completos não podem ser registrados como concluídos neste ambiente. Esse é um limite de plataforma do `node_modules` recebido, não um erro detectado no fonte: lint e os quatro `tsc --noEmit` passam.

No Windows do usuário, execute a trava final antes de commit/push:

```powershell
cd "C:\Projetos\trote-box"
npm ci
npm audit --omit=dev
npm run quality:release
```

## Configuração operacional obrigatória após substituir o fonte

No projeto `trotebox-api` da Vercel:

```text
AUTH_DELIVERY=brevo
BREVO_API_KEY=<segredo criado no Brevo>
EMAIL_FROM_NAME=TroteBox
EMAIL_FROM_ADDRESS=<remetente verificado no Brevo>
AUTH_CODE_TTL_MINUTES=7
```

No projeto `trotebox-web`, para usar o proxy same-origin atual, deixe `NEXT_PUBLIC_API_BASE_URL` ausente/vazio e mantenha `NEXT_PUBLIC_CLIENT_PLATFORM=web`.

A chave Brevo deve ser criada/armazenada diretamente na Vercel e nunca inserida no ZIP, GitHub ou documentação.

## Sanitização

O ZIP de origem continha conteúdo local que não deve ser distribuído: `.git`, `node_modules`, `apps/api/.env.local`, `apps/web/.env.local` e `packages/db/.env`. Esses itens são excluídos do pacote final.

O pacote final mantém apenas `.env.example` com placeholders não secretos.
