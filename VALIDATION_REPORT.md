# Relatório de validação — TroteBox 0.3.6

Data: 10 de agosto de 2026.

## Baseline confirmado no Windows

Antes desta consolidação, o projeto recuperado em `C:\Projetos\trote-box` concluiu `npm ci`, typecheck dos quatro workspaces, testes Vitest, build de produção da API e do Web e `npm audit --omit=dev` com **0 vulnerabilidades de produção**. O setup real aplicou a migration inicial e o seed no Supabase. Web respondeu HTTP 200 e a API retornou `health: ok`. O smoke funcional parou especificamente porque `CUSTOM_TTS_URL=` vazio era interpretado como URL inválida.

## Correções da 0.3.6

- `CUSTOM_TTS_URL=` vazio é normalizado para configuração ausente, com teste de regressão;
- revisão R2: o fixture desse teste declara `NODE_ENV: 'test'` para compatibilidade com a tipagem global gerada/carregada pelo Next.js 16;
- revisão R2: o smoke envia `X-Client-Platform: native` no `dev-login`, coerente com a política da API que só devolve JWT explicitamente para cliente nativo;
- scripts PowerShell verificam `$LASTEXITCODE` e não imprimem mais aprovação depois de falha de `npm`, `node` ou `docker`;
- `preflight` valida os quatro links de workspace `@trotebox/*`;
- `next-env.d.ts` é tratado como arquivo gerado e `next typegen` precede o typecheck dos apps Next;
- inventário/checksums ignoram `.env*` reais, `next-env.d.ts`, caches e builds;
- `inventory:verify` detecta manifests desatualizados;
- versões dos workspaces, dependências internas, OpenAPI e lockfile foram alinhadas em 0.3.6.

## Validações executadas no ambiente de empacotamento

- `node scripts/generate-inventory.mjs`: aprovado;
- `node scripts/verify-inventory.mjs`: aprovado;
- teste negativo de inventário desatualizado: aprovado (mudança temporária em README foi detectada);
- teste de exclusão: `.env.local`, `packages/db/.env` e `next-env.d.ts` temporários não entraram no inventário;
- `node scripts/validate-project.mjs`: **23 arquivos obrigatórios, 13 JSONs, 5 packages alinhados em 0.3.6, 64 fontes, 21 rotas/OpenAPI, 16 modelos e 6 enums Prisma**;
- teste negativo de versão de workspace desalinhada: aprovado;
- `node --no-warnings --experimental-strip-types scripts/domain-tests.mjs`: **7/7**;
- parse/transpilação sintática com TypeScript 5.8.x: **71 arquivos TS/TSX**, sem diagnóstico sintático;
- comparação de `package-lock.json`: **grafo de dependências de terceiros inalterado** em relação ao baseline 0.3.5 já auditado/compilado no Windows;
- manifests finais verificados sem caminhos de `.env.local`, `packages/db/.env`, `node_modules`, `.next`, `*.tsbuildinfo` ou `next-env.d.ts`.

## Limite do sandbox

A tentativa de `npm ci` no ambiente de empacotamento não pôde baixar os tarballs porque o registry intermediário do sandbox retornou `ECONNREFUSED`. Portanto, não é correto afirmar que o build completo foi recompilado neste sandbox. O grafo de terceiros não foi alterado; o baseline imediatamente anterior foi compilado integralmente no Windows.

## Única revalidação externa necessária

Como credenciais reais não são incluídas no ZIP, a confirmação final Web → API → Prisma → Supabase deve ser feita no Windows após substituir os arquivos:

```powershell
npm ci
npm run quality:full
npm run dev
```

Em outro terminal:

```powershell
npm run smoke:local
```

O smoke deve retornar `result: approved`.

## Revalidação Windows — revisão R2

Na primeira execução da acceptance 0.3.6 no Windows, `next typegen` tornou obrigatória a propriedade `NODE_ENV` em `NodeJS.ProcessEnv`; o novo teste de regressão construía um fixture tipado sem essa propriedade e o TypeScript retornou `TS2741`. A revisão R2 inclui `NODE_ENV: 'test'` nesse fixture. A revisão também corrige o smoke para solicitar o JWT de desenvolvimento como cliente `native`; sem esse header, o endpoint usa cookie para Web e omite `token`, enquanto o smoke depende de Bearer token. A falha não atingiu migration, seed, conectividade Supabase, runtime da API ou o parser de ambiente.
