import { describe, expect, it } from 'vitest';
import { maskPhone, validateRecipient } from './phone-policy';

describe('phone policy', () => {
  it('accepts regular E.164', () => expect(validateRecipient('+5511999999999')).toBe('+5511999999999'));
  it('blocks Brazilian emergency numbers before generic length validation', () => expect(() => validateRecipient('+55190')).toThrow());
  it('blocks special-rate destinations', () => expect(() => validateRecipient('+5508001234567')).toThrow());
  it('blocks repeated-digit patterns', () => expect(() => validateRecipient('+5511111111111')).toThrow());
  it('masks the middle digits', () => expect(maskPhone('+5511999999999')).toContain('••••••'));
});
