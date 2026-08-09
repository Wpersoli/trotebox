# Consolidação de marca — TroteBox 0.3.1

Esta revisão usa a arquitetura completa do projeto TroteBox como base e incorporou seletivamente as melhorias aprovadas do pacote comparado.

## Incorporado

- `logo-wordmark.png`;
- `mascot-hero.png`;
- ícones 16/32/48/64/180/192/256/512;
- `apple-touch-icon.png`;
- paleta baseada na arte aprovada;
- componente `Brand` reutilizável;
- timeout HTTP com `AbortController`;
- sanitização de erros do backend;
- `reactStrictMode`;
- headers web;
- sessão web por cookie `HttpOnly`.

## Preservado da base principal

- dashboard e navegação completos;
- preview local com mocks;
- API e OpenAPI;
- Prisma/migrations/ledger;
- Twilio/Vonage;
- Stripe/Mercado Pago;
- OTP/passwordless;
- políticas antiabuso e auditoria;
- scripts de setup, smoke test e validação.

## Não incorporado

Não foram adotados os resíduos de namespace/caminhos da versão comparada nem sua estrutura reduzida de backend.
