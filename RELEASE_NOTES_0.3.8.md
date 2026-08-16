# TroteBox 0.3.8 — Brevo OTP + proxy same-origin na Vercel

## Escopo

Release cirúrgica sobre a 0.3.7 para concluir a entrega real do OTP sem reabrir a arquitetura financeira. A integração de e-mail deixa de depender do Resend e passa a usar a API transacional oficial da Brevo. O Web também passa a usar um proxy same-origin na Vercel para evitar dependência de cookies cross-site entre dois projetos `*.vercel.app` durante a homologação sem domínio próprio.

## Alterações

- remove integração e variáveis do Resend;
- adiciona `AUTH_DELIVERY=brevo` e `BREVO_API_KEY` exclusivamente no backend;
- separa `EMAIL_FROM_NAME` e `EMAIL_FROM_ADDRESS`;
- envia OTP por `POST https://api.brevo.com/v3/smtp/email` com autenticação no header `api-key`;
- adiciona timeout e erro sanitizado quando a Brevo estiver indisponível ou rejeitar o envio;
- preserva OTP de seis dígitos, TTL de 7 minutos, uso único, máximo de 5 tentativas, cooldown de 60 s, invalidação no reenvio e rate limit;
- adiciona teste do payload transacional e testes das novas variáveis de ambiente;
- Web usa `/api/v1` em build de produção e `apps/web/vercel.json` faz rewrite para o projeto `trotebox-api`;
- o cookie `HttpOnly; Secure; SameSite=Lax` permanece inalterado e passa a trafegar pelo mesmo host público do Web durante a homologação;
- desenvolvimento local continua usando `http://localhost:3001/api/v1` quando `NEXT_PUBLIC_API_BASE_URL` não é definido; builds nativos podem definir a URL direta da API;
- nenhuma migration de banco é adicionada nesta versão;
- Supabase, sessões revogáveis, ledger, Mercado Pago, Stripe legado, Twilio/Vonage e demais domínios funcionais são preservados.

## Variáveis de produção — API

Configure no projeto `trotebox-api` da Vercel:

```text
AUTH_DELIVERY=brevo
BREVO_API_KEY=<segredo criado no painel Brevo>
EMAIL_FROM_NAME=TroteBox
EMAIL_FROM_ADDRESS=<remetente verificado no Brevo>
AUTH_CODE_TTL_MINUTES=7
```

`BREVO_API_KEY` é segredo. Não deve ser colocado no GitHub, em `.env.example`, prints ou documentação.

## Web na Vercel durante homologação sem domínio próprio

A aplicação Web chama `/api/v1/*` no próprio domínio. A Vercel encaminha essas rotas para:

```text
https://trotebox-api.vercel.app/api/v1/*
```

Assim, a sessão web não depende de cookie de terceiro entre `trotebox-web.vercel.app` e `trotebox-api.vercel.app`.

Quando houver domínio próprio, a rota de proxy pode continuar existindo ou ser apontada para o domínio definitivo da API.

## Segurança de distribuição

O ZIP/repositório distribuído não deve conter `.env`, `.env.local`, `packages/db/.env`, `.git`, `node_modules`, `.next`, `.vercel`, `out`, logs, `*.tsbuildinfo` ou chaves Brevo.
