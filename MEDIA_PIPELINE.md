# Pipeline de gravações

## Estado entregue

A gravação é opcional, desligada por padrão e somente é solicitada ao provedor quando:

1. `RECORDING_ENABLED=true` no backend;
2. o usuário confirmou `recordingConsentConfirmed=true`;
3. a chamada armazenou `recordingConsentAt`;
4. o callback do provedor passou pela validação de assinatura.

Twilio envia `RecordingStatusCallback`; Vonage usa uma ação NCCO `record` com `beepStart=true` e `eventUrl` dedicado. A API associa o evento à chamada, registra idempotência e criptografa a URL temporária/remota antes de persistir.

Nenhuma rota de usuário devolve a URL do provedor. O cliente recebe apenas status, duração e expiração.

## Worker obrigatório antes de produção

O callback não deve fazer download de mídia. Crie um worker assíncrono com esta sequência:

1. selecionar `Recording.status=AVAILABLE_AT_PROVIDER` sem `storageKey`;
2. bloquear o registro para impedir processamento concorrente;
3. descriptografar a URL dentro do worker;
4. baixar com autenticação do provedor e timeout curto;
5. impor limite de bytes, MIME allowlist e duração máxima;
6. calcular SHA-256 durante o streaming;
7. opcionalmente inspecionar/transcodificar em sandbox FFmpeg;
8. gravar em bucket privado com criptografia gerenciada/KMS;
9. atualizar `storageKey`, `sha256`, `contentType` e status;
10. apagar ou reduzir a retenção no provedor, quando permitido;
11. gerar acesso somente por URL assinada de curta duração e autorização por proprietário;
12. excluir automaticamente no vencimento e registrar auditoria.

## Regras operacionais

- não armazenar mídia no filesystem efêmero da Vercel;
- não registrar URL, token, número completo ou áudio em logs;
- não tornar bucket público;
- não usar a URL do provedor como URL de reprodução para o frontend;
- bloquear download após `expiresAt` ou `deletedAt`;
- permitir supressão e exclusão administrativa verificável;
- revisar consentimento e avisos sonoros para cada país/estado.
