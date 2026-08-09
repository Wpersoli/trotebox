import { describe, expect, it } from 'vitest';
import { createCallSchema, e164Schema, verifyAuthCodeSchema } from './index';

describe('contracts', () => {
  it('accepts a Brazilian E.164 number', () => {
    expect(e164Schema.parse('+5511999999999')).toBe('+5511999999999');
  });

  it('rejects a local number without country code', () => {
    expect(() => e164Schema.parse('11999999999')).toThrow();
  });

  it('requires affirmative consent', () => {
    expect(() => createCallSchema.parse({
      scriptId: 'cm1234567890123456789012',
      recipientPhone: '+5511999999999',
      consentConfirmed: false,
      idempotencyKey: '0f70ff90-1694-49ca-913b-b810668e3b2e'
    })).toThrow();
  });

  it('requires a six-digit authentication code', () => {
    expect(verifyAuthCodeSchema.parse({ email: 'user@example.com', code: '123456' }).code).toBe('123456');
    expect(() => verifyAuthCodeSchema.parse({ email: 'user@example.com', code: '123' })).toThrow();
  });
});
