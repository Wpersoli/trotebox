# Segurança — TroteBox 0.3.6

## Controles implementados

- Zod para validação de payloads;
- JWT HMAC com issuer/audience e expiração curta;
- sessão web por cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção;
- token só é retornado explicitamente para cliente identificado como `native`;
- CORS por allowlist com credenciais;
- cliente HTTP com timeout (`AbortController`) e mensagens de erro sanitizadas;
- headers de segurança no hosting web (CSP, HSTS, frame denial, nosniff, referrer e permissions policy);
- webhooks Stripe/Twilio/Vonage/Mercado Pago validados;
- idempotência em pagamentos, chamadas e webhooks;
- ledger de créditos em transações PostgreSQL;
- limites por usuário e destinatário;
- bloqueio de emergências/números especiais e supressão de destinatários;
- trilha de auditoria;
- criptografia de dados sensíveis no backend;
- gravação desativada por padrão e com fluxo de consentimento;
- cron protegido por segredo;
- autenticação de desenvolvimento desligável.

## Preview

`NEXT_PUBLIC_PREVIEW_MODE=true` utiliza somente dados simulados no frontend. `localStorage` é usado apenas para persistir o usuário **fictício de preview**, nunca um JWT real de produção.

## Antes de produção

1. Desative `ENABLE_DEV_AUTH`, `NEXT_PUBLIC_ENABLE_DEV_LOGIN` e `NEXT_PUBLIC_PREVIEW_MODE`.
2. Gere segredos distintos para JWT, criptografia, hashes, OTP e cron.
3. Configure domínios HTTPS definitivos e revise CSP/allowlist.
4. Teste webhooks com credenciais sandbox/teste antes de produção.
5. Implemente Secure Storage/Keychain/Keystore para sessão no Capacitor antes da publicação mobile.
6. Defina retenção e armazenamento privado de gravações.
7. Execute `npm audit`, SAST, DAST, pentest e revisão de dependências.
8. Adicione proteção de borda/WAF/rate limiting conforme o tráfego real.

## Segredos

Nunca versione `.env`, chaves privadas, URLs de banco com senha, tokens de provedores ou credenciais administrativas.
