# Relatório de validação — TroteBox 0.3.5

Data: 7 de agosto de 2026.

## Motivo da revisão

A execução real de `npm run quality` no Windows aprovou a estrutura, os 7 testes de domínio e o lint dos quatro workspaces, mas revelou 85 erros no typecheck da API. O relatório do Windows mostrou dois grupos principais: resolução incorreta do alias `@/server/*` e incompatibilidades de tipagem estrita (`exactOptionalPropertyTypes`) em Prisma/SDKs.

## Correções da 0.3.5

- `apps/api/tsconfig.json` e `apps/web/tsconfig.json` agora definem `baseUrl` local, fazendo `@/*` resolver dentro de cada workspace.
- Entradas Prisma opcionais foram normalizadas para não enviar `undefined` quando o tipo exige ausência da propriedade ou `null`.
- Payloads JSON de auditoria, eventos de chamada e webhooks usam tipos Prisma explícitos.
- Estados expiráveis do cron usam `CallStatus[]`, evitando estreitamento indevido do `includes`.
- Twilio só recebe opções de gravação quando a gravação está habilitada.
- Vonage usa as propriedades camelCase aceitas pelo tipo `OutboundCall` do SDK (`answerUrl` e `eventUrl`).
- Callback de resposta Vonage aceita GET e POST para compatibilidade com o método padrão do provedor.
- Callbacks com valores opcionais usam spread condicional em vez de propriedade explícita `undefined`.

## Revalidação executada no ambiente de empacotamento

- `node scripts/validate-project.mjs`: aprovado;
- `node --no-warnings --experimental-strip-types scripts/domain-tests.mjs`: 7/7 aprovado;
- imports internos estáticos: aprovados;
- rotas API/OpenAPI: alinhadas;
- Prisma: 16 modelos e 6 enums;
- scripts Node verificados sintaticamente;
- ZIP e checksum regenerados.

## Limite da validação

O ambiente de empacotamento não tem acesso ao registry npm usado no Windows, portanto não é possível reproduzir aqui o typecheck semântico completo com as dependências instaladas. A 0.3.5 foi criada especificamente a partir dos 85 diagnósticos reais do TypeScript enviados pelo Windows e corrige cada categoria reportada.

## Teste obrigatório no Windows antes do primeiro push

Faça uma extração limpa da 0.3.5, execute `npm install` e então:

```powershell
npm run quality
```

Critério de aprovação: retorno ao prompt sem `npm error`, sem erros ESLint/TypeScript/Vitest e com `next build` concluído.
