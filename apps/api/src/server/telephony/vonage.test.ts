import { generateKeyPairSync } from 'node:crypto';
import { decodeProtectedHeader, jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';
import { createVonageJwt } from './vonage';

describe('Vonage JWT', () => {
  it('creates a short-lived RS256 application token without the Vonage SDK', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const now = 1_800_000_000;
    const token = await createVonageJwt('app-test', privatePem, now);

    expect(decodeProtectedHeader(token)).toMatchObject({ alg: 'RS256', typ: 'JWT' });
    const { payload } = await jwtVerify(token, publicKey, { algorithms: ['RS256'], currentDate: new Date(now * 1000) });
    expect(payload.application_id).toBe('app-test');
    expect(payload.iat).toBe(now);
    expect(payload.nbf).toBe(now);
    expect(payload.exp).toBe(now + 300);
    expect(typeof payload.jti).toBe('string');
  });
});
