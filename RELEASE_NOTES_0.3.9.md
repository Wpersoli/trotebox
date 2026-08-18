# TroteBox 0.3.9 — isolamento de telefonia + disponibilidade operacional

## Objetivo

Hotfix de qualidade sobre a 0.3.8 após observação de produção: `/api/v1/calls` carregava o SDK Vonage mesmo sem a Vonage ser o provedor ativo e falhava com `ERR_REQUIRE_ESM` por incompatibilidade transitiva entre `@vonage/jwt` e `uuid` ESM. A 0.3.9 remove essa dependência frágil e evita expor ações de pagamento/telefonia enquanto a infraestrutura correspondente estiver incompleta.

## Correções

- remove `@vonage/server-sdk` e toda a cadeia transitiva `@vonage/*`/`uuid` associada;
- implementa criação de chamadas Vonage diretamente pela Voice API HTTPS com JWT RS256 de curta duração usando `jose`, já existente no backend;
- carrega adaptadores `mock`, Twilio e Vonage de forma lazy, somente quando o provedor selecionado é necessário;
- proíbe provedor `mock` em `NODE_ENV=production`, evitando captura/consumo de créditos por chamadas apenas simuladas;
- exige configuração completa de Vonage, incluindo credenciais de webhook assinado, antes de iniciar chamada real;
- recusa a criação da chamada antes de rate-limit/reserva financeira quando a telefonia real estiver indisponível;
- adiciona timeout e validação de resposta nas chamadas server-to-server ao Mercado Pago, preservando idempotência em retries;
- troca o wildcard de reexport do Prisma por exports explícitos para eliminar o warning de bundling CJS no Next/Turbopack;
- `GET /calls` deixa de depender do carregamento de qualquer SDK de telefonia;
- catálogo passa a informar capacidades operacionais sem expor segredos: Pix e chamadas;
- Web desabilita compra Pix quando token + webhook Mercado Pago não estão completos;
- Web desabilita início de chamadas quando telefonia real não está configurada;
- criação de novo Pix é bloqueada no backend se o webhook seguro do Mercado Pago ainda não estiver configurado;
- mensagens de indisponibilidade ficam orientadas ao usuário e deixam explícito que nenhuma cobrança/crédito foi consumido;
- nenhuma migration de banco é adicionada.

## Segurança operacional

- mock continua disponível em desenvolvimento/preview, mas nunca como telefonia real em produção;
- JWT Vonage usa `RS256`, `application_id`, `iat`, `nbf`, `exp` de 5 minutos e `jti` único;
- chave privada Vonage permanece exclusivamente no backend;
- falhas/timeout do provedor retornam erros sanitizados sem payload sensível do upstream;
- novos pagamentos Pix somente são anunciados/criados quando access token e segredo de webhook estão presentes.
