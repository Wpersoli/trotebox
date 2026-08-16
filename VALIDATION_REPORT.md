# Relatório de validação — TroteBox 0.3.7

Data: 15 de agosto de 2026.
Baseline de origem: `c36f7e7` (`main`) — `chore: ajusta cron para Vercel Hobby`.

## Veredito deste pacote

**APROVADO como fonte 0.3.7 sanitizado para revalidação e deploy controlado**, com uma condição operacional obrigatória: aplicar a migration de sessão/constraints no Supabase antes de publicar a nova API.

A aprovação acima é do código-fonte e do pacote entregue. Não declara que uma migration foi aplicada no banco de produção nem que credenciais externas reais foram exercitadas neste sandbox.

## Escopo alterado

- HOME unificada no padrão visual fornecido, com hero à esquerda e autenticação no mesmo documento;
- `/login` deixa de manter formulário duplicado e direciona para `/#acesso`;
- login público reduzido a **e-mail + OTP**; nome não é solicitado;
- OTP de seis dígitos, uso único, TTL padrão de 7 min, máximo de 5 tentativas por challenge, cooldown de 60 s e limites adicionais por e-mail/IP;
- reenvio invalida challenges anteriores;
- sessão passa a ser revogável no servidor por `sid`;
- logout revoga a sessão no banco;
- carteira e histórico permanecem vinculados ao usuário autenticado;
- Pix/Mercado Pago força o e-mail da sessão e não aceita e-mail do pagador vindo do cliente;
- CPF/CNPJ removido do payload desta jornada para reduzir tratamento de PII;
- conciliação Mercado Pago valida `Payment.id` e `providerPaymentId` esperados;
- consulta autenticada de status e cron de reconciliação preservam recuperação em caso de atraso de webhook;
- ledger recebe constraints SQL de sinais/reservas/valores;
- API rejeita origem web não autorizada em mutações;
- erros 5xx não devolvem `details` brutos de upstream em produção;
- documentação, OpenAPI, inventário e versão alinhados em 0.3.7.

## Validações executadas neste ambiente

- `npm run inventory`: **164 arquivos-fonte / 44 dependências**;
- `npm run validate:repo`: **23 arquivos obrigatórios, 13 JSONs, 5 packages 0.3.7, 66 fontes, 22 rotas/OpenAPI, 17 modelos Prisma e 6 enums**;
- `npm run inventory:verify`: aprovado;
- `npm run test:domain`: **7/7**;
- `npm run lint`: aprovado nos quatro workspaces;
- TypeScript direto (`tsc --noEmit`) em contracts, db, api e web: aprovado;
- grafo de dependências externas do `package-lock.json`: inalterado em relação ao baseline `c36f7e7`;
- teste de regressão por execução direta dos schemas de autenticação/Pix: aprovado;
- `git diff --check`: sem erro de whitespace (somente aviso esperado de normalização LF/CRLF no script PowerShell);
- varredura de reutilização: nenhum dos valores sensíveis encontrados nos `.env` enviados aparece em arquivo rastreado pelo Git;
- varredura por padrões de chaves privadas/tokens conhecidos: aprovada.

## Limite técnico do sandbox

O ZIP recebido contém `node_modules` instalado no Windows. Neste ambiente Linux, `next build`/Vitest exigem binários opcionais Linux (`@next/swc-linux-x64-gnu` e `@rollup/rollup-linux-x64-gnu`) que não vieram no upload. A rede direta do sandbox também não conseguiu obter esses binários. Por isso, **não é correto registrar `npm run quality:release` como concluído aqui**.

Esse limite é ambiental, não um diagnóstico de erro de TypeScript/lint/repositório: essas etapas foram executadas e aprovadas conforme a seção anterior.

## Migration obrigatória antes da nova API

A release adiciona:

`packages/db/prisma/migrations/20260815213000_revocable_sessions/migration.sql`

Ela cria sessões revogáveis e constraints financeiras. A API 0.3.7 depende da tabela `Session` no login.

No Windows, com as variáveis corretas de banco carregadas e **antes de publicar a API nova**:

```powershell
npm ci
npm run db:generate
npm run db:deploy
npm run quality:release
```

Se `db:deploy` acusar violação de constraint em dado histórico, **não force a migration**: audite a linha apontada antes de prosseguir.

## Segredos do ZIP de origem

O arquivo recebido continha arquivos locais de ambiente ignorados pelo Git. Eles não fazem parte do pacote sanitizado final. Como essas credenciais saíram do seu computador no upload, trate-as como potencialmente expostas e faça rotação das chaves/URLs sensíveis antes do deploy definitivo.
