import { describe, expect, it } from 'vitest';
import { mercadoPagoSignedDataId } from './mercadopago';

describe('Mercado Pago webhook resource id', () => {
  it('accepts the dotted query key documented in webhook examples', () => {
    expect(mercadoPagoSignedDataId(new URL('https://api.example.test/webhook?data.id=123'))).toBe('123');
  });

  it('accepts the data_id query key used by the official SDK validator example', () => {
    expect(mercadoPagoSignedDataId(new URL('https://api.example.test/webhook?data_id=ABC-123'))).toBe('ABC-123');
  });

  it('rejects parameter smuggling when both aliases disagree', () => {
    expect(() => mercadoPagoSignedDataId(new URL('https://api.example.test/webhook?data.id=123&data_id=456')))
      .toThrowError(/ambíguo/i);
  });
});
