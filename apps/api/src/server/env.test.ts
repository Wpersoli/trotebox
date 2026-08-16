import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const baseEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  JWT_SECRET: 'j'.repeat(32),
  DATA_ENCRYPTION_KEY: 'd'.repeat(32),
  HASH_PEPPER: 'h'.repeat(32),
  AUTH_CODE_PEPPER: 'a'.repeat(32),
  TELEPHONY_PROVIDER: 'mock',
  VOICE_ENGINE: 'provider',
  ENABLE_DEV_AUTH: 'true',
  MOCK_CALL_AUTO_COMPLETE: 'true',
  TWILIO_VALIDATE_SIGNATURES: 'true',
  RECORDING_ENABLED: 'false'
};

describe('environment parsing', () => {
  it('treats an empty CUSTOM_TTS_URL as absent in provider mode', () => {
    const parsed = parseEnv({ ...baseEnv, CUSTOM_TTS_URL: '' });
    expect(parsed.CUSTOM_TTS_URL).toBeUndefined();
  });

  it('accepts a valid CUSTOM_TTS_URL', () => {
    const parsed = parseEnv({ ...baseEnv, CUSTOM_TTS_URL: 'https://tts.example.test/speak' });
    expect(parsed.CUSTOM_TTS_URL).toBe('https://tts.example.test/speak');
  });

  it('rejects an invalid CUSTOM_TTS_URL', () => {
    expect(() => parseEnv({ ...baseEnv, CUSTOM_TTS_URL: 'not-a-url' })).toThrow();
  });

  it('uses a short seven-minute OTP TTL by default', () => {
    const parsed = parseEnv(baseEnv);
    expect(parsed.AUTH_CODE_TTL_MINUTES).toBe(7);
  });

});
