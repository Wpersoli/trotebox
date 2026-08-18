import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';
import { platformCapabilities } from './capabilities';

const base = {
  NODE_ENV: 'production',
  JWT_SECRET: 'j'.repeat(32),
  DATA_ENCRYPTION_KEY: 'd'.repeat(32),
  HASH_PEPPER: 'h'.repeat(32),
  AUTH_CODE_PEPPER: 'a'.repeat(32),
  TELEPHONY_PROVIDER: 'mock',
  VOICE_ENGINE: 'provider',
  ENABLE_DEV_AUTH: 'false',
  MOCK_CALL_AUTO_COMPLETE: 'false',
  TWILIO_VALIDATE_SIGNATURES: 'true',
  RECORDING_ENABLED: 'false'
} satisfies NodeJS.ProcessEnv;

describe('platform capabilities', () => {
  it('does not expose mock telephony as available in production', () => {
    expect(platformCapabilities(parseEnv(base)).outboundCalls).toBe(false);
  });

  it('only exposes Pix when token and webhook secret are both configured', () => {
    expect(platformCapabilities(parseEnv({ ...base, MERCADOPAGO_ACCESS_TOKEN: 'token' })).pixPayments).toBe(false);
    expect(platformCapabilities(parseEnv({ ...base, MERCADOPAGO_ACCESS_TOKEN: 'token', MERCADOPAGO_WEBHOOK_SECRET: 'secret' })).pixPayments).toBe(true);
  });

  it('requires complete Vonage production configuration', () => {
    const partial = parseEnv({ ...base, TELEPHONY_PROVIDER: 'vonage', VONAGE_APPLICATION_ID: 'app', VONAGE_PRIVATE_KEY: 'key', VONAGE_FROM_NUMBER: '5511000000000' });
    expect(platformCapabilities(partial).outboundCalls).toBe(false);

    const complete = parseEnv({
      ...base,
      TELEPHONY_PROVIDER: 'vonage',
      VONAGE_APPLICATION_ID: 'app',
      VONAGE_API_KEY: 'api-key',
      VONAGE_PRIVATE_KEY: 'key',
      VONAGE_FROM_NUMBER: '5511000000000',
      VONAGE_SIGNATURE_SECRET: 'signature-secret'
    });
    expect(platformCapabilities(complete).outboundCalls).toBe(true);
  });
});
