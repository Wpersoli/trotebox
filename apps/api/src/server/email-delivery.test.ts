import { describe, expect, it } from 'vitest';
import { buildAuthEmailPayload } from './email-delivery';

describe('authentication email payload', () => {
  it('builds a Brevo transactional email without exposing unrelated account data', () => {
    const payload = buildAuthEmailPayload({
      recipientEmail: 'cliente@example.com',
      code: '482193',
      ttlMinutes: 7,
      senderName: 'TroteBox',
      senderAddress: 'sender@example.com'
    });

    expect(payload.sender).toEqual({ name: 'TroteBox', email: 'sender@example.com' });
    expect(payload.to).toEqual([{ email: 'cliente@example.com' }]);
    expect(payload.subject).toBe('Seu código de acesso TroteBox');
    expect(payload.htmlContent).toContain('482193');
    expect(payload.htmlContent).toContain('7 minutos');
    expect(payload.htmlContent).not.toContain('saldo');
    expect(payload.htmlContent).not.toContain('CPF');
  });
});
