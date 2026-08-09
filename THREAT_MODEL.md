# Modelo de ameaças resumido

| Ameaça | Impacto | Controle primário |
|---|---:|---|
| Crédito duplicado por webhook repetido | financeiro crítico | `WebhookEvent` único + transação |
| Compra falsa informada pelo cliente | financeiro crítico | confirmação somente por webhook/consulta ao provedor |
| Chamada sem saldo | alto | reserva atômica antes do provedor |
| Abuso contra o mesmo destinatário | alto | limite diário + supressão |
| Falsificação de webhook | crítico | assinatura HMAC/JWT/Twilio signature |
| Replay de webhook | alto | chave única externa + tolerância temporal |
| Vazamento de segredo no bundle | crítico | segredos apenas em `apps/api` |
| Manipulação de preço/pack | alto | pack resolvido pelo banco, nunca pelo valor do cliente |
| Caller ID falsificado | jurídico/alto | número de origem fixo e verificado no provedor |
| Gravação sem consentimento | jurídico/crítico | desligada por padrão + consentimento separado |
| Enumeração de chamadas | privacidade | autorização por `userId` em todas as consultas |
| Corrida de saldo | financeiro crítico | transação serializável/atualização condicional |
