import twilio from 'twilio';
import { jwtVerify } from 'jose';
import { env } from './env';
import { safeEqualHex, sha256 } from './crypto';
import { AppError } from './http';

export async function validateTwilioRequest(request: Request, params: Record<string, string>) {
  const config = env();
  if (!config.TWILIO_VALIDATE_SIGNATURES && config.NODE_ENV !== 'production') return true;
  if (!config.TWILIO_AUTH_TOKEN) throw new AppError(503, 'TWILIO_NOT_CONFIGURED', 'Token Twilio ausente.');
  const signature = request.headers.get('x-twilio-signature') ?? '';
  const incoming = new URL(request.url);
  const canonicalUrl = new URL(`${incoming.pathname}${incoming.search}`, `${config.PUBLIC_API_URL.replace(/\/$/, '')}/`).toString();
  return twilio.validateRequest(config.TWILIO_AUTH_TOKEN, signature, canonicalUrl, params);
}

export async function validateVonageRequest(request: Request, rawBody?: string) {
  const config = env();
  if (!config.VONAGE_SIGNATURE_SECRET) throw new AppError(503, 'VONAGE_WEBHOOK_NOT_CONFIGURED', 'Segredo de webhook Vonage ausente.');
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return false;
  try {
    const { payload } = await jwtVerify(authorization.slice(7), new TextEncoder().encode(config.VONAGE_SIGNATURE_SECRET), { algorithms: ['HS256'] });
    if (config.VONAGE_API_KEY && payload.api_key !== config.VONAGE_API_KEY) return false;
    if (rawBody && typeof payload.payload_hash === 'string' && !safeEqualHex(payload.payload_hash, sha256(rawBody))) return false;
    return true;
  } catch {
    return false;
  }
}
