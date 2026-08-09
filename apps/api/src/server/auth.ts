import { SignJWT, jwtVerify } from 'jose';
import type { NextResponse } from 'next/server';
import { prisma } from '@trotebox/db';
import { env } from './env';
import { AppError } from './http';

const issuer = 'trotebox-api';
const audience = 'trotebox-clients';
const secret = () => new TextEncoder().encode(env().JWT_SECRET);
export const SESSION_COOKIE = 'trotebox_session';
const SESSION_TTL_SECONDS = 3600;

export async function issueToken(user: { id: string; email: string; displayName: string }, ttlSeconds = SESSION_TTL_SECONDS) {
  return new SignJWT({ email: user.email, name: user.displayName })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret());
}

function cookieToken(request: Request) {
  const cookie = request.headers.get('cookie') ?? '';
  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function setSessionCookie<T extends NextResponse>(response: T, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: env().NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  });
  return response;
}

export function clearSessionCookie<T extends NextResponse>(response: T) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: env().NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
  return response;
}

export function tokenForNativeClient(request: Request, token: string) {
  return request.headers.get('x-client-platform') === 'native' ? token : undefined;
}

export async function requireUser(request: Request) {
  const authorization = request.headers.get('authorization');
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  const token = bearerToken ?? cookieToken(request);
  if (!token) throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');

  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ['HS256'],
      issuer,
      audience
    });
    if (!payload.sub) throw new AppError(401, 'INVALID_TOKEN', 'Token inválido.');
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') throw new AppError(403, 'ACCOUNT_DISABLED', 'Conta indisponível.');
    return user;
  } catch (cause) {
    if (cause instanceof AppError) throw cause;
    throw new AppError(401, 'INVALID_TOKEN', 'Sessão inválida ou expirada.');
  }
}
