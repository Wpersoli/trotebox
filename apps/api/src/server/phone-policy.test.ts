import { describe, expect, it, vi } from 'vitest';
import { maskPhone, validateRecipient } from './phone-policy';

function expectAppError(fn: () => unknown, code: string, status: number) {
  try {
    fn();
  } catch (cause) {
    expect(cause).toMatchObject({ code, status });
    return;
  }
  throw new Error(`Esperava AppError ${code}.`);
}

describe('phone policy', () => {
  it('accepts regular Brazilian E.164 destinations by default', () => expect(validateRecipient('+5511999999999')).toBe('+5511999999999'));
  it('blocks Brazilian emergency numbers before generic length validation', () => expect(() => validateRecipient('+55190')).toThrow());
  it('blocks special-rate destinations', () => expect(() => validateRecipient('+5508001234567')).toThrow());
  it('blocks repeated-digit patterns', () => expect(() => validateRecipient('+5511111111111')).toThrow());
  it('blocks destinations outside the configured country-prefix allowlist', () => {
    expectAppError(() => validateRecipient('+14155552671'), 'DESTINATION_NOT_ALLOWED', 403);
  });
  it('supports an explicit additional country prefix when deliberately configured', () => {
    vi.stubEnv('ALLOWED_RECIPIENT_PREFIXES', '+55,+1');
    try {
      expect(validateRecipient('+14155552671')).toBe('+14155552671');
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it('fails closed when the destination allowlist is malformed', () => {
    vi.stubEnv('ALLOWED_RECIPIENT_PREFIXES', '55');
    try {
      expectAppError(() => validateRecipient('+5511999999999'), 'RECIPIENT_POLICY_MISCONFIGURED', 500);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it('masks the middle digits', () => expect(maskPhone('+5511999999999')).toContain('••••••'));
});
