# Política de dependências

As versões em `package.json` estão pinadas para impedir atualizações implícitas durante a primeira instalação. O pacote não inclui `package-lock.json` porque o ambiente de geração não conseguiu alcançar o registro npm; gere e versione o lockfile na primeira estação com acesso normal.

## Processo de admissão

1. executar `npm install` em branch isolada;
2. versionar `package-lock.json` sem edição manual;
3. executar `npm audit --omit=dev` e uma segunda fonte de SCA;
4. conferir proveniência, mantenedor, licença e scripts de instalação;
5. executar `npm run quality`;
6. testar Stripe, Mercado Pago, Twilio e Vonage em sandbox;
7. promover somente após revisão do diff e plano de rollback.

## Atualizações

- patch/minor: atualizar em lote pequeno, nunca automaticamente em produção;
- major: abrir migração dedicada e ler guias oficiais;
- SDK financeiro/telefonia: validar payload, tipos, assinatura e idempotência novamente;
- Prisma: gerar cliente, aplicar migração em banco descartável e testar concorrência do ledger;
- Capacitor: sincronizar Android/iOS e revisar permissões/manifests nativos;
- Next.js: validar exportação estática, rotas, headers e comportamento do proxy.

O arquivo `DEPENDENCY_MANIFEST.csv` contém as versões declaradas por workspace. Um SBOM definitivo deve ser gerado após o lockfile, pois apenas ele revela a árvore transitiva real.
