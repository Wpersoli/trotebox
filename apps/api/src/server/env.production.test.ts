import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const base = {
  NODE_ENV: 'production',
  PUBLIC_WEB_URL: 'https://trotebox.example',
  PUBLIC_API_URL: 'https://api.trotebox.example',
  ALLOWED_ORIGINS: 'https://trotebox.example',
  JWT_SECRET: 'j'.repeat(32),
  DATA_ENCRYPTION_KEY: 'd'.repeat(32),
  HASH_PEPPER: 'h'.repeat(32),
  AUTH_CODE_PEPPER: 'a'.repeat(32),
  ENABLE_DEV_AUTH: 'false',
  AUTH_DELIVERY: 'brevo',
  BREVO_API_KEY: 'brevo-key',
  EMAIL_FROM_ADDRESS: 'no-reply@trotebox.example',
  TELEPHONY_PROVIDER: 'twilio',
  MOCK_CALL_AUTO_COMPLETE: 'false',
  TWILIO_ACCOUNT_SID: 'AC123',
  TWILIO_AUTH_TOKEN: 'auth-token',
  TWILIO_FROM_NUMBER: '+5511000000000',
  TWILIO_VALIDATE_SIGNATURES: 'true',
  VOICE_ENGINE: 'provider',
  RECORDING_ENABLED: 'false',
  CRON_SECRET: 'cron-secret-123456'
} satisfies NodeJS.ProcessEnv;

describe('production environment guards', () => {
  it('requires HTTPS for public URLs and origins', () => {
    expect(() => parseEnv({ ...base, PUBLIC_WEB_URL: 'http://trotebox.example' })).toThrow(
      'PUBLIC_WEB_URL and PUBLIC_API_URL must use HTTPS in production.'
    );
    expect(() => parseEnv({ ...base, ALLOWED_ORIGINS: 'http://trotebox.example' })).toThrow(
      'All ALLOWED_ORIGINS entries must use HTTPS in production.'
    );
  });

  it('requires Brevo delivery configuration', () => {
    expect(() => parseEnv({ ...base, BREVO_API_KEY: '' })).toThrow(
      'BREVO_API_KEY and EMAIL_FROM_ADDRESS are required in production.'
    );
  });

  it('requires complete custom TTS configuration', () => {
    expect(() => parseEnv({ ...base, VOICE_ENGINE: 'custom' })).toThrow(
      'CUSTOM_TTS_URL and CUSTOM_TTS_API_KEY are required when VOICE_ENGINE=custom.'
    );
    expect(() => parseEnv({
      ...base,
      VOICE_ENGINE: 'custom',
      CUSTOM_TTS_URL: 'http://tts.example',
      CUSTOM_TTS_API_KEY: 'tts-key',
      CUSTOM_TTS_ALLOWED_HOSTS: 'tts.example'
    })).toThrow('CUSTOM_TTS_URL must use HTTPS in production.');
  });

  it('requires complete Twilio production configuration', () => {
    expect(() => parseEnv({ ...base, TWILIO_AUTH_TOKEN: '' })).toThrow(
      'Twilio account credentials and from number are required in production.'
    );
  });

  it('requires cron authentication in production', () => {
    expect(() => parseEnv({ ...base, CRON_SECRET: '' })).toThrow('CRON_SECRET is required in production.');
    const parsed = parseEnv(base);
    expect(parsed.CRON_SECRET).toBe('cron-secret-123456');
  });
});
