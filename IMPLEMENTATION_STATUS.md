# Estado da implementação — TroteBox 0.3.5

## Implementado

- identidade TroteBox com wordmark, mascote e ícones responsivos;
- landing page clara e responsiva;
- login, dashboard, catálogo, novo trote, histórico, créditos e configurações;
- modo preview completo com dados simulados, sem banco/API;
- Next.js com exportação estática + Capacitor Android/iOS;
- API separada com OTP/passwordless, sessão web `HttpOnly` e JWT para fluxo nativo;
- PostgreSQL/Prisma com usuários, consentimentos, catálogo, chamadas, eventos, pagamentos, carteira, ledger, webhooks, supressão, rate limit e auditoria;
- adaptadores mock, Twilio e Vonage;
- Stripe Checkout e Pix Mercado Pago;
- gravação opcional consentida;
- TTS por provedor ou API própria;
- políticas antiabuso, idempotência e concorrência financeira.

## Melhorias da 0.3.5

1. Wordmark e mascote separados para responsividade real.
2. Pacote completo de ícones PWA/iOS/Android.
3. Paleta ajustada à arte TroteBox.
4. `Brand` reutilizável com modo compacto.
5. Cliente HTTP com timeout e sanitização de erros.
6. Sessão web por cookie `HttpOnly` em vez de JWT real no `localStorage`.
7. `reactStrictMode` ativado.
8. Headers de segurança no `vercel.json` mantendo compatibilidade com `output: export`.
9. Preview sem infraestrutura externa.
10. Preflight bloqueia dependências ausentes antes de tentar iniciar a stack.
11. Caminhos/documentação alinhados a `C:\Projetos\trote-box` e ao repositório `Wpersoli/trotebox`.

## Ainda depende de infraestrutura real

- `npm install`, lint/typecheck/build com dependências efetivamente baixadas;
- banco PostgreSQL/Supabase e migrations reais;
- Twilio/Vonage sandbox;
- Stripe/Mercado Pago sandbox;
- Android Studio/Xcode;
- armazenamento seguro mobile;
- pipeline definitivo de gravações;
- testes de carga, SAST/DAST, pentest e revisão jurídica.
