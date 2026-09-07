import { describe, expect, it } from 'vitest';
import { safeEqualHex } from './crypto';

describe('safeEqualHex', () => {
  it('compares valid hexadecimal values without exposing timing differences', () => {
    expect(safeEqualHex('aabbcc', 'AABBCC')).toBe(true);
    expect(safeEqualHex('aabbcc', 'aabbcd')).toBe(false);
  });

  it('fails closed for malformed, odd-length or empty input', () => {
    expect(() => safeEqualHex('zzzzzz', 'aabbcc')).not.toThrow();
    expect(safeEqualHex('zzzzzz', 'aabbcc')).toBe(false);
    expect(safeEqualHex('abc', 'abc')).toBe(false);
    expect(safeEqualHex('', '')).toBe(false);
  });
});
