# TroteBox 0.3.6

Release de estabilização local e recovery.

## Correções

- `CUSTOM_TTS_URL=` vazio deixa de invalidar o ambiente quando TTS custom não está configurado.
- Scripts PowerShell só imprimem sucesso quando comandos nativos realmente retornam exit code 0.
- `preflight` detecta workspaces npm ausentes/quebrados e orienta `npm ci`.
- `next-env.d.ts` passa a ser tratado como gerado pelo Next.js 16; `next typegen` antecede o typecheck.
- manifests de recovery excluem `.env*` reais e arquivos gerados, com verificação por `npm run inventory:verify`.
- versões dos workspaces e lockfile alinhadas em 0.3.6.
- `scripts/acceptance-local.ps1` automatiza a validação final Windows + Supabase em um único comando.

## Validação esperada

```powershell
npm ci
npm audit --omit=dev
npm run inventory:verify
npm run quality:full
```

Para teste funcional com Supabase já configurado: iniciar `npm run dev` e, em outro terminal, executar `npm run smoke:local`.

## Revisão R2 — acceptance Windows

- Corrige o teste `apps/api/src/server/env.test.ts` para declarar `NODE_ENV: 'test'`, exigido pela ampliação de `NodeJS.ProcessEnv` carregada pelo Next.js 16 durante `next typegen`.
- Corrige `scripts/smoke-local.mjs` para identificar o login de desenvolvimento como cliente `native`, permitindo que a API devolva o JWT usado pelo restante do smoke.
- A falha observada era apenas de tipagem do fixture de teste (`TS2741`), não de runtime, Supabase, Prisma ou aplicação.
- Mantém a versão de produto em `0.3.6`; esta revisão substitui o pacote de entrega anterior antes da aprovação final.

## Revisão R3 — encerramento da acceptance

- Torna a limpeza de Web/API pós-smoke best-effort: falhas ao encerrar um processo já finalizado não invalidam uma acceptance funcionalmente aprovada.
- Remove a dependência de `taskkill` no `finally`; a árvore de processos é encerrada por CIM + `Stop-Process` com tratamento não crítico.
- O banner `ACCEPTANCE APROVADA` agora é emitido somente depois da limpeza pós-teste, evitando sucesso seguido por exceção de teardown.
