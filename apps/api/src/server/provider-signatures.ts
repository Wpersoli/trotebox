import twilio from 'twilio';
import { jwtVerify } from 'jose';
import { env } from './env';
import { safeEqualHex, sha256 } from './crypto';
import { AppError } from './http';

/**
 * Twilio signs the exact public URL it requested. Vercel can expose the same
 * function through more than one alias (for example the canonical project
 * domain and a deployment alias), while PUBLIC_API_URL is intentionally a
 * single configured value. Keep the configured URL as the first candidate,
 * then accept the URL received by the platform so a valid callback is not
 * rejected solely because an alias was used.
 */
export function twilioWebhookUrls(request: Request, publicApiUrl: string) {
  const incoming = new URL(request.url);
  const path = `${incoming.pathname}${incoming.search}`;
  const configured = new URL(
    path,
    `${publicApiUrl.replace(/\/$/, '')}/`
  ).toString();
  const urls = [configured, incoming.toString()];

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (
    request.headers.has('x-vercel-id')
    && forwardedHost
    && (forwardedProto === 'http' || forwardedProto === 'https')
  ) {
    try {
      urls.push(new URL(path, `${forwardedProto}://${forwardedHost}`).toString());
    } catch {
      // Ignore malformed forwarding metadata and keep the trusted candidates.
    }
  }

  return [...new Set(urls)];
}

export async function validateTwilioRequest(request: Request, params: Record<string, string>) {
  const config = env();
  if (!config.TWILIO_VALIDATE_SIGNATURES && config.NODE_ENV !== 'production') return true;
  if (!config.TWILIO_AUTH_TOKEN) throw new AppError(503, 'TWILIO_NOT_CONFIGURED', 'Token Twilio ausente.');
  const signature = request.headers.get('x-twilio-signature') ?? '';
  return twilioWebhookUrls(request, config.PUBLIC_API_URL).some((canonicalUrl) => (
    twilio.validateRequest(config.TWILIO_AUTH_TOKEN!, signature, canonicalUrl, params)
  ));
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
