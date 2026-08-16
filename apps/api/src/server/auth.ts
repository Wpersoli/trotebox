import { randomUUID } from 'node:crypto';
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

type SessionRow = { id: string };
type VerifiedSessionPayload = { sub: string; sid: string };

export async function issueToken(user: { id: string; email: string; displayName: string }, ttlSeconds = SESSION_TTL_SECONDS) {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  // Raw SQL keeps this release compatible with a pre-generated Prisma client
  // during staged deployments. The migration must be applied before the API.
  await prisma.$executeRaw`
    INSERT INTO "Session" ("id", "userId", "expiresAt", "createdAt")
    VALUES (${sessionId}, ${user.id}, ${expiresAt}, NOW())
  `;

  return new SignJWT({ email: user.email, name: user.displayName, sid: sessionId })
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

function requestToken(request: Request) {
  const authorization = request.headers.get('authorization');
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  return bearerToken ?? cookieToken(request);
}

async function verifiedPayload(request: Request) {
  const token = requestToken(request);
  if (!token) throw new AppError(401, 'AUTH_REQUIRED', 'Autenticação necessária.');

  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ['HS256'],
      issuer,
      audience
    });
    if (!payload.sub || typeof payload.sid !== 'string') throw new AppError(401, 'INVALID_TOKEN', 'Token inválido.');
    return { sub: payload.sub, sid: payload.sid } satisfies VerifiedSessionPayload;
  } catch (cause) {
    if (cause instanceof AppError) throw cause;
    throw new AppError(401, 'INVALID_TOKEN', 'Sessão inválida ou expirada.');
  }
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
  const payload = await verifiedPayload(request);
  const sessionRows = await prisma.$queryRaw<SessionRow[]>`
    SELECT "id"
    FROM "Session"
    WHERE "id" = ${payload.sid}
      AND "userId" = ${payload.sub}
      AND "revokedAt" IS NULL
      AND "expiresAt" > NOW()
    LIMIT 1
  `;
  if (sessionRows.length !== 1) throw new AppError(401, 'SESSION_REVOKED', 'Sessão inválida ou expirada.');

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== 'ACTIVE') throw new AppError(403, 'ACCOUNT_DISABLED', 'Conta indisponível.');
  return user;
}

export async function revokeSession(request: Request) {
  const token = requestToken(request);
  if (!token) return;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'], issuer, audience });
    if (payload.sub && typeof payload.sid === 'string') {
      await prisma.$executeRaw`
        UPDATE "Session"
        SET "revokedAt" = NOW()
        WHERE "id" = ${payload.sid}
          AND "userId" = ${payload.sub}
          AND "revokedAt" IS NULL
      `;
    }
  } catch {
    // Logout remains idempotent even when the cookie/token is already invalid.
  }
}
