# Política de dependências

As versões diretas em `package.json` são pinadas e `package-lock.json` é obrigatório. Instalações reproduzíveis usam `npm ci`; `npm install` fica reservado para alterações deliberadas de dependências/lockfile.

## Processo de admissão

1. alterar dependências em branch isolada;
2. atualizar e revisar `package-lock.json`;
3. executar `npm audit --omit=dev`;
4. conferir proveniência, mantenedor, licença e scripts de instalação;
5. executar `npm run inventory`, `npm run inventory:verify` e `npm run quality:full`;
6. testar integrações alteradas em sandbox;
7. promover somente após revisão do diff e plano de rollback.

## Atualizações

- patch/minor: atualizar em lote pequeno, nunca automaticamente em produção;
- major: abrir migração dedicada e ler os guias oficiais;
- SDK financeiro/telefonia: revalidar payload, tipos, assinatura e idempotência;
- Prisma: gerar cliente, aplicar migration em banco descartável e testar concorrência do ledger;
- Capacitor: sincronizar Android/iOS e revisar permissões/manifests nativos;
- Next.js: validar typegen, build, rotas, headers e comportamento do proxy.

`DEPENDENCY_MANIFEST.csv` registra dependências diretas declaradas. `package-lock.json` é a fonte de verdade da árvore transitiva instalada.
