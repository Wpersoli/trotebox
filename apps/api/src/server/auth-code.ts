import { createHmac, randomInt } from 'node:crypto';
import { Prisma, prisma } from '@trotebox/db';
import type { RequestAuthCodeInput, VerifyAuthCodeInput } from '@trotebox/contracts';
import { env } from './env';
import { hashSubject, safeEqualHex } from './crypto';
import { AppError } from './http';
import { enforceRateLimits } from './rate-limit';
import { deliverAuthCode } from './email-delivery';

const DEFAULT_DISPLAY_NAME = 'Cliente TroteBox';

function codeHash(email: string, code: string) {
  return createHmac('sha256', env().AUTH_CODE_PEPPER).update(`${email}:${code}`).digest('hex');
}

function requestIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')?.trim()
    ?? 'unknown';
}

export async function requestAuthCode(input: RequestAuthCodeInput, request: Request) {
  const email = input.email.toLowerCase();
  const ip = requestIp(request);

  // Anti-spam e anti-enumeração. As três cotas são avaliadas e registradas na
  // mesma transação serializável para evitar consumo parcial de quota quando
  // uma regra mais ampla (por exemplo, IP compartilhado) já está saturada.
  await enforceRateLimits([
    { bucket: 'auth:request:email:60s', subjectHash: hashSubject(email), limit: 1, windowMs: 60 * 1000 },
    { bucket: 'auth:request:email:15m', subjectHash: hashSubject(email), limit: 5, windowMs: 15 * 60 * 1000 },
    { bucket: 'auth:request:ip:15m', subjectHash: hashSubject(ip), limit: 20, windowMs: 15 * 60 * 1000 }
  ]);

  const code = String(randomInt(100000, 1_000_000));
  const now = new Date();

  // Reenvio invalida challenges anteriores ainda abertos para o mesmo e-mail.
  await prisma.authCode.updateMany({
    where: { email, consumedAt: null },
    data: { consumedAt: now }
  });

  const authCode = await prisma.authCode.create({
    data: {
      email,
      displayName: DEFAULT_DISPLAY_NAME,
      codeHash: codeHash(email, code),
      expiresAt: new Date(now.getTime() + env().AUTH_CODE_TTL_MINUTES * 60 * 1000)
    }
  });

  try {
    const delivery = await deliverAuthCode(email, code);
    return { accepted: true, ...delivery };
  } catch (cause) {
    await prisma.authCode.delete({ where: { id: authCode.id } }).catch(() => undefined);
    throw cause;
  }
}

export async function verifyAuthCode(input: VerifyAuthCodeInput, request: Request) {
  const email = input.email.toLowerCase();
  const ip = requestIp(request);

  await enforceRateLimits([
    { bucket: 'auth:verify:email:15m', subjectHash: hashSubject(email), limit: 10, windowMs: 15 * 60 * 1000 },
    { bucket: 'auth:verify:ip:15m', subjectHash: hashSubject(ip), limit: 50, windowMs: 15 * 60 * 1000 }
  ]);

  const authCode = await prisma.authCode.findFirst({
    where: { email, consumedAt: null },
    orderBy: { createdAt: 'desc' }
  });
  if (!authCode || authCode.expiresAt <= new Date() || authCode.attempts >= 5) {
    throw new AppError(401, 'INVALID_AUTH_CODE', 'Código inválido ou expirado.');
  }

  if (!safeEqualHex(authCode.codeHash, codeHash(email, input.code))) {
    const changed = await prisma.authCode.updateMany({
      where: { id: authCode.id, consumedAt: null, attempts: { lt: 5 } },
      data: { attempts: { increment: 1 } }
    });
    if (changed.count !== 1) throw new AppError(401, 'INVALID_AUTH_CODE', 'Código inválido ou expirado.');
    throw new AppError(401, 'INVALID_AUTH_CODE', 'Código inválido ou expirado.');
  }

  return prisma.$transaction(async (tx) => {
    const consumed = await tx.authCode.updateMany({
      where: { id: authCode.id, consumedAt: null, attempts: { lt: 5 }, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() }
    });
    if (consumed.count !== 1) throw new AppError(409, 'AUTH_CODE_ALREADY_USED', 'Código já utilizado ou expirado.');

    const existing = await tx.user.findUnique({ where: { email } });
    if (existing && existing.status !== 'ACTIVE') throw new AppError(403, 'ACCOUNT_DISABLED', 'Conta indisponível.');
    const user = existing ?? await tx.user.create({ data: { email, displayName: DEFAULT_DISPLAY_NAME } });
    await tx.walletAccount.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    return user;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
