import { isIP } from 'node:net';

function firstValidIp(value: string | null) {
  if (!value) return undefined;

  for (const candidate of value.split(',')) {
    const normalized = candidate.trim();
    if (isIP(normalized)) return normalized;
  }

  return undefined;
}

/**
 * Reads the platform-provided client address for abuse controls and audit
 * telemetry. Vercel documents x-vercel-forwarded-for as the stable value when
 * another proxy sits in front of a deployment. Generic headers are used only
 * outside production (for local development); production fails closed to a
 * shared identity if the Vercel marker is absent. Invalid values are ignored
 * instead of becoming an attacker-controlled rate-limit identity.
 */
export function requestIp(request?: Request) {
  if (!request) return undefined;

  const vercelIp = firstValidIp(request.headers.get('x-vercel-forwarded-for'));
  if (vercelIp && request.headers.get('x-vercel-id')?.trim()) return vercelIp;
  if (process.env.NODE_ENV === 'production') return undefined;

  return firstValidIp(request.headers.get('x-forwarded-for'))
    ?? firstValidIp(request.headers.get('x-real-ip'));
}
