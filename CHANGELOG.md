# Changelog
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
