import twilio from 'twilio';
import { describe, expect, it, vi } from 'vitest';
import { validateTwilioRequest, twilioWebhookUrls } from './provider-signatures';

const authToken = 'twilio-auth-token';
const params = {
  CallSid: 'CA00000000000000000000000000000000',
  CallStatus: 'completed',
  SequenceNumber: '1'
};

vi.stubEnv('NODE_ENV', 'test');
vi.stubEnv('JWT_SECRET', 'j'.repeat(32));
vi.stubEnv('DATA_ENCRYPTION_KEY', 'd'.repeat(32));
vi.stubEnv('HASH_PEPPER', 'h'.repeat(32));
vi.stubEnv('AUTH_CODE_PEPPER', 'a'.repeat(32));
vi.stubEnv('PUBLIC_API_URL', 'https://api.trotebox.example');
vi.stubEnv('TWILIO_AUTH_TOKEN', authToken);
vi.stubEnv('TWILIO_VALIDATE_SIGNATURES', 'true');

describe('Twilio webhook signatures', () => {
  it('keeps configured and received public aliases as signature candidates', () => {
    const request = new Request('https://trotebox-api.vercel.app/api/v1/webhooks/twilio/status?source=voice', {
      headers: {
        'x-vercel-id': 'iad1::request',
        'x-forwarded-host': 'trotebox-api.vercel.app',
        'x-forwarded-proto': 'https'
      }
    });

    expect(twilioWebhookUrls(request, 'https://api.trotebox.example')).toEqual([
      'https://api.trotebox.example/api/v1/webhooks/twilio/status?source=voice',
      'https://trotebox-api.vercel.app/api/v1/webhooks/twilio/status?source=voice'
    ]);
  });

  it('accepts a valid Twilio signature when Vercel received an alias URL', async () => {
    const receivedUrl = 'https://trotebox-api.vercel.app/api/v1/webhooks/twilio/status';
    const signature = twilio.getExpectedTwilioSignature(authToken, receivedUrl, params);
    const request = new Request(receivedUrl, {
      method: 'POST',
      headers: { 'x-twilio-signature': signature }
    });

    await expect(validateTwilioRequest(request, params)).resolves.toBe(true);
  });
});
