# TroteBox — qualidade e evolução

## Direção autorizada em 06/09/2026

Priorizar qualidade, segurança, desempenho e UX; executar melhorias autonomamente, sem confundir testes aprovados com garantia absoluta. A nova aparência pode suceder o fechamento dos fluxos críticos.

Quatro referências fornecidas pelo usuário: roxo/laranja, mascote, catálogo com prévias, saldo acessível, comparação de créditos e Pix com confirmação clara. Contadores sociais, popularidade, bônus, compartilhamentos de gravações e expiração só serão apresentados quando sustentados por dados e funcionalidade real. Áudios de demonstração precisam ser localizados/validados antes de prometer prévias.

## Correções desta etapa

- Pix aceita chave estável do cliente; tentativa incerta reaproveita a solicitação. A carteira guarda a intenção por usuário na sessão da aba para recuperação após recarregar; bloqueia troca de pacote até recuperar a solicitação anterior. Não é sincronização entre abas/dispositivos.
- Timeout de criação Pix passa a 30 segundos; timeout de resposta não afirma cancelamento da operação no servidor.
- Corrida de inserção de pagamento recupera o registro vencedor, validando usuário, pacote e provedor.
- Retentativa utiliza valor e créditos registrados no pagamento, mesmo se o pacote mudar; pacote desativado não impede recuperar solicitação existente.
- Confirmação atualiza carteira antes de encerrar o polling; cabeçalho recebe sinal para consultar saldo novamente.
- Polling com limite informa pausa e permite nova consulta. Falha de carregamento tem mensagem explícita; código Pix tem nome acessível; validade exibe somente o valor retornado pelo provedor.
- “Mais escolhido” substituído por destaque editorial; destaque dos pacotes usa o campo do catálogo, não sua posição.
- Workspace autenticado recebeu uma camada visual escura e responsiva, com saldo persistente no cabeçalho, CTA de recarga, estados de atividade legíveis, catálogo com waveform decorativo e cards de pacote sem alegações sociais não verificadas.
- A página pública foi alinhada à mesma linguagem roxo/laranja das referências, preservando o cartão de acesso claro para manter contraste e foco na conversão. O mascote e os assets existentes foram reaproveitados; nenhum áudio fictício foi anunciado.
- Ao abrir a carteira, uma intenção Pix pendente da sessão é recuperada automaticamente com a mesma chave idempotente, evitando duplicidade depois de recarregar a página.
- A liquidação interna agora só aprova pagamentos pendentes ou já aprovados; aprovações tardias não reabrem pagamentos rejeitados, cancelados, reembolsados ou contestados. Notificações Mercado Pago fora de ordem também não rebaixam pagamentos já liquidados ou encerrados.
- O formulário de novo trote valida telefone em formato E.164 e apelido opcional antes da requisição, reduzindo chamadas inválidas e deixando a orientação de erro clara para o usuário.

## Evidência e limites

Testes adicionados: recuperação de chave após falha de rede, conservação de preço/créditos, concorrência de inserção e rejeição de chave pertencente a outra conta. Testes do banco/provedor usam mocks; não demonstram concorrência real em PostgreSQL nem pagamento real.

Execução local: 14 testes de domínio; 58 testes unitários (6 contratos, 49 API, 3 Web); lint, tipos e build Web aprovados na revisão. npm audit --omit=dev --audit-level=high retornou zero vulnerabilidades reportadas em 06/09/2026. Runtime local Node 24; projeto exige Node 22, portanto a execução no CI Node 22 continua sendo gate.

## Gates ainda abertos

1. ~~CI sobre o commit final e verificação da interface em navegador.~~ Concluído nesta candidata: `quality` e `CodeQL` verdes no commit remoto `963172a3c27ece2ef73661e9f572a325ae259911`; preview Web/API `READY` e smoke check público concluído.
2. Pagamento ponta a ponta com conta de teste/configuração apropriada: Pix, webhook assinado, crédito único e reconciliação.
3. Telefonia controlada com destinatário autorizado e orçamento definidos, incluindo saldo/callbacks e falhas.
4. Áudio aprovado, acessibilidade/mobile em dispositivo real, desempenho medido e divulgação com conteúdo real; a primeira camada visual e a acessibilidade estrutural do Web foram concluídas nesta candidata, mas a validação em dispositivo físico e com conteúdo final continua aberta.
5. Configuração de produção e rollback conferidos antes da promoção. Nenhum novo merge em main ou promoção de produção integra esta etapa.

Históricos de conversa ainda inacessíveis não bloqueiam estas correções de código; a auditoria de decisões permanece parcial.

## Evidência da candidata visual

- Branch `audit/sniper-10of10-2026-09`; código visual no commit remoto `86d70056d6ccc3b7a1ec613fb986f3c12a2c3ab2`; candidata final de acessibilidade no commit `bf2c1c70f819a42aff950e64f5a845d762bf9d8a`.
- Vercel Web e API geraram deployments `READY` para o commit de evidência; o healthcheck da API retornou HTTP 200 com banco `ok` e `cache-control: no-store`.
- CI do commit de evidência: workflows `quality` e `CodeQL` concluídos com sucesso.
- Preview público conferido em desktop: assets carregados após hidratação, contraste do cartão de acesso corrigido, skip-link moveu o foco por teclado para o conteúdo principal, FAQ expandiu normalmente e nenhum erro da aplicação apareceu no console (os únicos registros foram mensagens de uma extensão do navegador).
- A rota autenticada não foi simulada no navegador sem uma conta/OTP real; o build, contratos, testes e estados do código foram verificados sem transmitir credenciais.

## Evidência de segurança e desempenho desta auditoria

- A candidata atual de liquidação e formulário foi publicada no commit remoto `963172a3c27ece2ef73661e9f572a325ae259911`; Web `dpl_4oqJqkbXm9js27WSCiZUfg5rZj6J` e API `dpl_8SPVsdLPoJrsRBxhQ72mXzp9Zh8d` terminaram `READY`, sem promoção dos aliases de produção. O healthcheck da API retornou HTTP 200 com banco `ok`.
- Esta auditoria foi publicada no commit remoto `94a57e8291b73ef40a44581ac6c06997285f601b`; Web `dpl_A6AwXF8t7EzGBvRHhaD8jtet5Ruh` e API `dpl_4HBYjn1R8cGiCyqfi7cvabEQMoGY` terminaram `READY`, sem promoção dos aliases de produção.
- No preview protegido, a navegação de smoke concluiu em aproximadamente 2,95 s incluindo o handshake temporário do Vercel; esse número não é LCP/INP/CLS e não substitui medição em dispositivo físico. O DOM final estava completo, o hero tinha 1500 px de largura natural e os preloads de ícone e hero estavam presentes.
- O build local produziu 724,7 KiB de JavaScript e 48,4 KiB de CSS não comprimidos; o hero WebP tem 163,2 KiB. Esses números são inventário do artefato, não uma promessa de transferência de rede, e ficam registrados para a próxima medição real.
- Web e API não apresentaram clusters de erro em runtime nas últimas 24 horas; os logs de erro/fatal de produção também não retornaram eventos.
- A API agora envia CSP mínima (`default-src 'none'`), `X-Frame-Options`, `Permissions-Policy` e COOP além de `nosniff`, referrer restrito e `no-store`.
- O preview não falha quando localStorage é bloqueado ou corrompido: o usuário armazenado é validado antes da restauração e a sessão corrente continua utilizável. QR Codes só aceitam base64 de imagem permitido; links de pagamento só são expostos quando usam HTTPS.
- `npm audit --omit=dev --audit-level=high` continuou retornando zero vulnerabilidades após as alterações. A validação integral local permaneceu verde: 14 testes de domínio, 58 testes unitários, lint, tipos e build Web.
