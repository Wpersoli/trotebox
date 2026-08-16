# Changelog

## 0.3.8 — 2026-08-16

- Migra entrega de OTP de Resend para a API transacional Brevo sem alterar as regras de geração/validação do código.
- Move transporte de e-mail para módulo dedicado e adiciona testes do payload/remetente.
- Substitui `RESEND_API_KEY`/`EMAIL_FROM` por `BREVO_API_KEY`, `EMAIL_FROM_NAME` e `EMAIL_FROM_ADDRESS`.
- Adiciona proxy `/api/v1/*` no projeto Web da Vercel para manter a sessão same-origin durante homologação em `*.vercel.app`.
- Mantém desenvolvimento local apontando para `localhost:3001` e permite override por `NEXT_PUBLIC_API_BASE_URL`.
- Não adiciona migration de banco nem altera ledger, sessões, Pix/Mercado Pago ou telefonia.

## 0.3.7 — 2026-08-15

- Unifica HOME e acesso passwordless por e-mail.
- Adiciona sessão revogável por `sid`, hardening de OTP e constraints financeiras.
- Vincula Pix ao e-mail autenticado e adiciona reconciliação Mercado Pago.

- Revisão 0.3.6 R2: `smoke:local` passa `X-Client-Platform: native` no dev login para obter o JWT esperado pelo teste ponta a ponta.
- Revisão de entrega 0.3.6 R2: corrige fixture `env.test.ts` com `NODE_ENV: test` para o `NodeJS.ProcessEnv` do Next.js 16.

## 0.3.6 — 2026-08-10

- Corrige `CUSTOM_TTS_URL=` vazio no modo de voz do provedor e adiciona testes de regressão.
- Corrige falsos positivos de sucesso em scripts PowerShell quando `npm`, `node` ou `docker` retornam erro.
- Faz o preflight validar links dos quatro workspaces npm antes da stack iniciar.
- Trata `next-env.d.ts` como arquivo gerado pelo Next.js 16 e executa `next typegen` antes do typecheck.
- Torna inventário/checksums determinísticos e exclui `.env*` reais, `next-env.d.ts`, caches e artefatos.
- Adiciona `inventory:verify` e alinhamento de versão/lockfile.

## 0.3.5

- Corrige resolução do alias `@/server/*` no workspace da API com `baseUrl` local.
- Corrige incompatibilidades com `exactOptionalPropertyTypes` em entradas Prisma.
- Tipagem explícita dos estados expiráveis do cron.
- Ajusta opções condicionais do Twilio para não enviar `undefined`.
- Alinha o payload Vonage aos tipos camelCase do SDK e mantém GET/POST no callback de resposta.
- Mantém o fluxo local sem Turborepo introduzido na 0.3.4.


## 0.3.4 — 2026-08-07

- Remove Turborepo da orquestração local após falha nativa `0xC0000135` observada no Windows; scripts raiz agora usam workspaces npm diretamente.
- Corrige os dois avisos `@next/next/no-img-element` usando `next/image` no dashboard e login.
- Restringe regras específicas de Pages Router aos pacotes Next, eliminando falsos avisos em `packages/contracts` e `packages/db`.
- `npm run quality` passa a ser executável sem Supabase e compila o frontend real; `npm run quality:full` preserva a validação completa da stack configurada.
- Preflight passa a verificar `next`, `eslint` e `tsc` em vez de `turbo`.

## 0.3.3 — 2026-08-07

- corrige o asset `logo-wordmark.png`, que estava recortado verticalmente;
- torna header, wordmark e mascote fluidos com `clamp()`, `minmax()` e `object-fit: contain`;
- limita a altura do mascote no desktop para evitar corte abaixo da primeira dobra;
- empilha o hero em tablet/mobile e reduz proporcionalmente os elementos decorativos;
- adiciona breakpoints dedicados em 1100, 860, 700 e 460 px;
- adiciona `sizes` às imagens responsivas do Next.js;
- integra fundo transparente nos assets principais de marca para eliminar blocos retangulares visuais;
- mantém o modo preview sem Supabase/Docker e toda a arquitetura da 0.3.1.

## 0.3.1 — 2026-08-07

- consolida identidade TroteBox;
- incorpora wordmark e mascote independentes;
- adiciona pacote completo de ícones PWA/mobile;
- refina paleta clara da marca;
- adiciona `Brand` responsivo/compacto;
- adiciona timeout e sanitização de erros no cliente HTTP;
- adiciona sessão web por cookie `HttpOnly`;
- preserva preview local sem Supabase/Docker/API;
- adiciona headers de segurança no hosting web;
- corrige preflight para detectar dependências ausentes;
- corrige validação de caminhos para Windows/Linux;
- documenta caminho `C:\Projetos\trote-box` e repositório `Wpersoli/trotebox`;
- adiciona `/auth/session` e `/auth/logout` ao contrato OpenAPI.
