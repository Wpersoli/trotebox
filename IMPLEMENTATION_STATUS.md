# Estado da implementação — TroteBox 0.3.7

## Implementado

- identidade TroteBox com wordmark, mascote e ícones responsivos;
- HOME unificada conforme referência: apresentação à esquerda e acesso passwordless à direita;
- login incorporado à HOME; `/login` apenas redireciona para o acesso; dashboard, catálogo, novo trote, histórico, créditos e configurações permanecem protegidos;
- modo preview completo com dados simulados, sem banco/API;
- Next.js com exportação estática + Capacitor Android/iOS;
- API separada com OTP/passwordless endurecido, sessão web revogável `HttpOnly` e JWT com `sid` para fluxo nativo;
- PostgreSQL/Prisma com usuários, consentimentos, catálogo, chamadas, eventos, pagamentos, carteira, ledger, webhooks, supressão, rate limit e auditoria;
- adaptadores mock, Twilio e Vonage;
- Pix Mercado Pago vinculado ao e-mail autenticado, com webhook + reconciliação ativa; adaptador Stripe preservado no backend;
- gravação opcional consentida;
- TTS por provedor ou API própria;
- políticas antiabuso, idempotência e concorrência financeira.

## Melhorias da 0.3.7

1. HOME única com autenticação integrada ao layout aprovado.
2. Campo Nome removido do acesso; identidade operacional baseada somente no e-mail confirmado.
3. OTP com cooldown de 60 s, invalidação do código anterior, 5 tentativas por challenge e rate limit de verificação por e-mail/IP.
4. Sessões revogáveis no servidor por `sid`; logout invalida a sessão além de apagar o cookie.
5. Pix vinculado ao e-mail autenticado; o navegador não escolhe a identidade financeira do pagamento.
6. Reconciliação Mercado Pago por webhook, polling autenticado durante o pagamento e cron de backstop.
7. Constraints SQL contra reserva negativa, valores financeiros inválidos e inversão de sinais do ledger.
8. Rejeição ativa de origens não autorizadas em requisições mutáveis da API.
9. ZIP de distribuição deve excluir `.env*` reais, `.git`, `node_modules`, `.next`, `out` e artefatos locais.

## Melhorias da 0.3.6

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

- banco PostgreSQL/Supabase: conexão, migration inicial e seed já validados no ambiente local; resta validar o smoke final da 0.3.7 após a correção de TTS;
- Twilio/Vonage sandbox;
- Stripe/Mercado Pago sandbox;
- Android Studio/Xcode;
- armazenamento seguro mobile;
- pipeline definitivo de gravações;
- testes de carga, SAST/DAST, pentest e revisão jurídica.
