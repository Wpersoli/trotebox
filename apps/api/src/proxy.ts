import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000,capacitor://localhost,https://localhost,http://localhost')
    .split(',').map((value) => value.trim()).filter(Boolean);
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  const allowed = allowedOrigins().includes(origin);
  const headers = new Headers();
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,Idempotency-Key,X-Request-Id,X-Client-Platform');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('Vary', 'Origin');
  if (allowed) headers.set('Access-Control-Allow-Origin', origin);

  if (request.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers });

  const response = NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = { matcher: '/api/:path*' };
