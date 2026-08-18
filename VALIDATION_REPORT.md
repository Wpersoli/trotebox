# Relatório de validação — TroteBox 0.3.9

Data: 18 de agosto de 2026.
Baseline recebido: `ac64c85` (`main`) — hotfix do proxy same-origin sobre a 0.3.8.

## Evidência que motivou a correção

Logs de produção mostraram `GET/POST /api/v1/calls` em 500 por `ERR_REQUIRE_ESM` dentro de `@vonage/jwt` → `uuid`, enquanto `/wallet` e `/catalog` permaneciam em 200. O Mercado Pago retornava 503 controlado por ausência de configuração.

## Veredito deste pacote

**APROVADO como fonte TroteBox 0.3.9 sanitizado para revalidação final no Windows e deploy controlado.**

A correção elimina a dependência Vonage que causava o crash, desacopla providers opcionais e adiciona bloqueios de disponibilidade no backend e no Web. Não há migration nova.

## Validações executadas neste ambiente

- ESLint nos quatro workspaces (contracts, db, API e Web): aprovado, zero warnings;
- TypeScript direto (`tsc --noEmit`) em contracts, db, API e Web: aprovado;
- `npm audit --omit=dev --offline`: 0 vulnerabilidades conhecidas no cache de advisories disponível;
- lockfile: workspaces alinhados em 0.3.9, `nanoid` 3.3.18 e nenhuma dependência `@vonage/*`/`uuid` da cadeia removida;
- `npm ls --omit=dev`: workspaces e dependências produtivas resolvidos;
- teste runtime independente do mecanismo JWT Vonage: token RS256 verificado, `application_id` correto e expiração de 300 s;
- `npm run validate:repo`: 23 arquivos obrigatórios, 13 JSONs, 5 packages alinhados em 0.3.9, 71 fontes, 22 rotas/OpenAPI, 17 modelos Prisma e 6 enums;
- inventário final: 171 arquivos-fonte e 43 dependências declaradas;
- domain tests: 7/7;
- varredura de segredos executada antes do empacotamento final.

## Limite técnico do sandbox

O ZIP recebido trazia `node_modules` instalado no Windows. No sandbox Linux faltam binários opcionais nativos Linux de SWC/Rollup; por isso Vitest/`next build` completos não são tratados como evidência local desta release. Isso não é mascarado como sucesso.

A trava obrigatória no Windows antes de commit/push permanece:

```powershell
cd "C:\Projetos\trote-box"
npm ci
npm audit --omit=dev
npm run quality:release
```

## Sanitização

O pacote final exclui `.git`, `node_modules`, `.next`, `.vercel`, `.env`, `.env.local`, `packages/db/.env`, caches, logs e `*.tsbuildinfo`. Apenas exemplos sem segredo permanecem.

## Hardening adicional da revisão final

- Telefonia indisponível falha antes de criar reserva financeira/rate-limit de chamada.
- Timeouts de upstream Mercado Pago impedem funções serverless presas indefinidamente; retries mantêm a mesma chave idempotente.
- Reexport Prisma passou a nomes explícitos para remover o warning `export *` sobre CommonJS no Turbopack.
