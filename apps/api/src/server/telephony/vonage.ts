import { createPrivateKey, randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { env } from '../env';
import { AppError } from '../http';
import type { StartCallInput, StartCallResult, TelephonyProvider } from './types';

const VONAGE_VOICE_CALLS_URL = 'https://api.nexmo.com/v1/calls';
const REQUEST_TIMEOUT_MS = 12_000;

export async function createVonageJwt(applicationId: string, privateKey: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  let key: ReturnType<typeof createPrivateKey>;
  try {
    key = createPrivateKey(privateKey.replace(/\\n/g, '\n'));
  } catch {
    throw new AppError(503, 'VONAGE_PRIVATE_KEY_INVALID', 'Chave privada Vonage inválida.');
  }

  return new SignJWT({ application_id: applicationId })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(nowSeconds)
    .setNotBefore(nowSeconds)
    .setExpirationTime(nowSeconds + 300)
    .setJti(randomUUID())
    .sign(key);
}

export class VonageTelephonyProvider implements TelephonyProvider {
  async startCall(input: StartCallInput): Promise<StartCallResult> {
    const config = env();
    if (!config.VONAGE_APPLICATION_ID || !config.VONAGE_API_KEY || !config.VONAGE_PRIVATE_KEY || !config.VONAGE_FROM_NUMBER || !config.VONAGE_SIGNATURE_SECRET) {
      throw new AppError(503, 'VONAGE_NOT_CONFIGURED', 'Vonage não configurado de forma completa e segura.');
    }

    const token = await createVonageJwt(config.VONAGE_APPLICATION_ID, config.VONAGE_PRIVATE_KEY);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(VONAGE_VOICE_CALLS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: [{ type: 'phone', number: input.to.replace(/^\+/, '') }],
          from: { type: 'phone', number: config.VONAGE_FROM_NUMBER.replace(/^\+/, '') },
          answer_url: [input.answerUrl],
          event_url: [input.statusUrl]
        }),
        signal: controller.signal
      });

      const payload = await response.json().catch(() => null) as { uuid?: unknown } | null;
      if (!response.ok) {
        throw new AppError(502, 'VONAGE_REQUEST_FAILED', 'Vonage recusou a criação da chamada.');
      }

      const uuid = typeof payload?.uuid === 'string' ? payload.uuid : '';
      if (!uuid) throw new AppError(502, 'VONAGE_INVALID_RESPONSE', 'Vonage não retornou identificador da chamada.');
      return { provider: 'vonage', providerCallId: uuid };
    } catch (cause) {
      if (cause instanceof AppError) throw cause;
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        throw new AppError(504, 'VONAGE_TIMEOUT', 'Vonage não respondeu dentro do tempo limite.');
      }
      throw new AppError(502, 'VONAGE_UNAVAILABLE', 'Não foi possível iniciar a chamada pela Vonage.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
