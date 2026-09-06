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

## Evidência e limites

Testes adicionados: recuperação de chave após falha de rede, conservação de preço/créditos, concorrência de inserção e rejeição de chave pertencente a outra conta. Testes do banco/provedor usam mocks; não demonstram concorrência real em PostgreSQL nem pagamento real.

Execução local: 14 testes de domínio; 53 testes unitários (6 contratos, 44 API, 3 Web); lint, tipos e build Web aprovados na revisão. npm audit --omit=dev --audit-level=high retornou zero vulnerabilidades reportadas em 06/09/2026. Runtime local Node 24; projeto exige Node 22, portanto a execução no CI Node 22 continua sendo gate.

## Gates ainda abertos

1. CI sobre o commit final e verificação da interface em navegador.
2. Pagamento ponta a ponta com conta de teste/configuração apropriada: Pix, webhook assinado, crédito único e reconciliação.
3. Telefonia controlada com destinatário autorizado e orçamento definidos, incluindo saldo/callbacks e falhas.
4. Nova interface completa, áudio aprovado, acessibilidade/mobile, desempenho medido e divulgação com conteúdo real.
5. Configuração de produção e rollback conferidos antes da promoção. Nenhum novo merge em main ou promoção de produção integra esta etapa.

Históricos de conversa ainda inacessíveis não bloqueiam estas correções de código; a auditoria de decisões permanece parcial.
