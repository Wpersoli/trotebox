# Segurança — TroteBox 0.3.7

## Controles implementados

- Zod para validação de payloads;
- JWT HMAC com issuer/audience, `sid` e expiração curta;
- sessão web revogável no servidor por `sid`, com cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção;
- token só é retornado explicitamente para cliente identificado como `native`;
- CORS por allowlist com credenciais e rejeição ativa de origens não autorizadas em operações mutáveis;
- cliente HTTP com timeout (`AbortController`) e mensagens de erro sanitizadas;
- erros de infraestrutura/upstream não devolvem `details` brutos em produção;
- headers de segurança no hosting web (CSP, HSTS, frame denial, nosniff, referrer e permissions policy);
- OTP de seis dígitos com uso único, 5 tentativas por challenge, cooldown de 60 s, TTL curto e rate limit adicional por e-mail/IP;
- webhooks Stripe/Twilio/Vonage/Mercado Pago validados;
- reconciliação Mercado Pago vinculada ao `Payment.id` e `providerPaymentId` esperados;
- idempotência em pagamentos, chamadas e webhooks;
- ledger de créditos em transações PostgreSQL, com constraints de banco para sinais e reservas;
- limites por usuário e destinatário;
- bloqueio de emergências/números especiais e supressão de destinatários;
- trilha de auditoria;
- criptografia de dados sensíveis no backend;
- Pix desta jornada não coleta CPF/CNPJ; a identidade de pagamento é vinculada ao e-mail autenticado;
- gravação desativada por padrão e com fluxo de consentimento;
- cron protegido por segredo;
- autenticação de desenvolvimento desligável.

## Preview

`NEXT_PUBLIC_PREVIEW_MODE=true` utiliza somente dados simulados no frontend. `localStorage` é usado apenas para persistir o usuário **fictício de preview**, nunca um JWT real de produção.

## Antes de produção

1. Desative `ENABLE_DEV_AUTH`, `NEXT_PUBLIC_ENABLE_DEV_LOGIN` e `NEXT_PUBLIC_PREVIEW_MODE`.
2. Gere segredos distintos para JWT, criptografia, hashes, OTP e cron.
3. Configure domínios HTTPS definitivos e revise CSP/allowlist.
4. Configure `AUTH_CODE_TTL_MINUTES=7`, SMTP/Resend próprio e teste entregabilidade do OTP.
5. Teste webhooks com credenciais sandbox/teste antes de produção.
6. Implemente Secure Storage/Keychain/Keystore para sessão no Capacitor antes da publicação mobile.
7. Defina retenção e armazenamento privado de gravações.
8. Execute `npm audit`, SAST, DAST, pentest e revisão de dependências.
9. Adicione proteção de borda/WAF/rate limiting conforme o tráfego real.

## Segredos

Nunca versione `.env`, chaves privadas, URLs de banco com senha, tokens de provedores ou credenciais administrativas.
