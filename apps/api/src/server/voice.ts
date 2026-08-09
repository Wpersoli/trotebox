import type { Script } from '@trotebox/db';
import { env } from './env';
import { AppError } from './http';

export async function prepareVoiceAsset(script: Script) {
  const config = env();
  if (config.VOICE_ENGINE === 'provider') return undefined;
  if (!config.CUSTOM_TTS_URL || !config.CUSTOM_TTS_API_KEY) {
    throw new AppError(503, 'CUSTOM_TTS_NOT_CONFIGURED', 'API própria de voz não configurada.');
  }

  const response = await fetch(config.CUSTOM_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.CUSTOM_TTS_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `script-${script.id}-${script.updatedAt.getTime()}`
    },
    body: JSON.stringify({
      text: script.body,
      locale: script.voiceLocale,
      voice: script.voiceName,
      format: 'mp3'
    }),
    signal: AbortSignal.timeout(15_000)
  });
  const payload = await response.json().catch(() => null) as { audioUrl?: string; error?: string } | null;
  if (!response.ok || !payload?.audioUrl) {
    throw new AppError(502, 'CUSTOM_TTS_FAILED', 'A API própria de voz não retornou áudio válido.', payload);
  }
  const audioUrl = new URL(payload.audioUrl);
  if (audioUrl.protocol !== 'https:') throw new AppError(502, 'CUSTOM_TTS_INSECURE_URL', 'A URL de áudio precisa usar HTTPS.');
  const allowedHosts = (config.CUSTOM_TTS_ALLOWED_HOSTS ?? new URL(config.CUSTOM_TTS_URL).hostname)
    .split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
  if (!allowedHosts.includes(audioUrl.hostname.toLowerCase())) {
    throw new AppError(502, 'CUSTOM_TTS_HOST_NOT_ALLOWED', 'O host do áudio não está autorizado.');
  }
  return audioUrl.toString();
}
