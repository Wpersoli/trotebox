import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000,capacitor://localhost,https://localhost,http://localhost')
    .split(',').map((value) => value.trim()).filter(Boolean);
}

function isMutation(method: string) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  const allowed = Boolean(origin) && allowedOrigins().includes(origin);
  const headers = new Headers();
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,Idempotency-Key,X-Request-Id,X-Client-Platform');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('Vary', 'Origin');
  if (allowed) headers.set('Access-Control-Allow-Origin', origin);

  // CORS sozinho não bloqueia o envio da requisição. Para chamadas iniciadas
  // por navegador, uma origem explicitamente não autorizada é rejeitada antes
  // de alcançar rotas mutáveis. Webhooks server-to-server normalmente não
  // enviam Origin e continuam funcionando.
  if (origin && !allowed && (request.method === 'OPTIONS' || isMutation(request.method))) {
    return NextResponse.json({ error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Origem não autorizada.' } }, { status: 403, headers });
  }

  if (request.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers });

  const response = NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = { matcher: '/api/:path*' };
