# Contrato da API própria de voz

Defina no backend:

```text
VOICE_ENGINE=custom
CUSTOM_TTS_URL=https://voz.seudominio.com/v1/synthesize
CUSTOM_TTS_API_KEY=segredo-do-backend
```

A API recebe:

```json
{
  "text": "Texto do roteiro",
  "locale": "pt-BR",
  "voice": "nome-opcional",
  "format": "mp3"
}
```

Cabeçalhos enviados:

```text
Authorization: Bearer <CUSTOM_TTS_API_KEY>
Content-Type: application/json
Idempotency-Key: script-<id>-<updatedAt>
```

Resposta esperada:

```json
{
  "audioUrl": "https://storage.seudominio.com/audio/arquivo-assinado.mp3"
}
```

A URL precisa usar HTTPS e permanecer disponível durante o estabelecimento da chamada. Para produção, use uma URL assinada, com expiração suficiente, conteúdo não enumerável, MIME correto e sem revelar segredos. O arquivo é reproduzido por `<Play>` no Twilio ou `stream` no Vonage. Com `VOICE_ENGINE=provider`, o texto é sintetizado pelo mecanismo nativo do provedor.

A URL retornada precisa usar HTTPS e o hostname deve estar em `CUSTOM_TTS_ALLOWED_HOSTS`. Quando a lista fica vazia, somente o hostname de `CUSTOM_TTS_URL` é aceito. Isso impede que uma resposta comprometida aponte a telefonia para um host arbitrário.
