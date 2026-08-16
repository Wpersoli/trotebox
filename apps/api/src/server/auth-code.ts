import { createHmac, randomInt } from 'node:crypto';
import { Prisma, prisma } from '@trotebox/db';
import type { RequestAuthCodeInput, VerifyAuthCodeInput } from '@trotebox/contracts';
import { env } from './env';
import { hashSubject, safeEqualHex } from './crypto';
import { AppError } from './http';
import { enforceRateLimit } from './rate-limit';

const DEFAULT_DISPLAY_NAME = 'Cliente TroteBox';

function codeHash(email: string, code: string) {
  return createHmac('sha256', env().AUTH_CODE_PEPPER).update(`${email}:${code}`).digest('hex');
}

function requestIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')?.trim()
    ?? 'unknown';
}

async function deliverCode(email: string, code: string) {
  const config = env();
  if (config.AUTH_DELIVERY === 'console') {
    if (config.NODE_ENV === 'production') throw new AppError(503, 'AUTH_DELIVERY_NOT_CONFIGURED', 'Entrega de código não configurada.');
    console.info('development_auth_code', { email, code });
    return { devCode: code };
  }
  if (!config.RESEND_API_KEY || !config.EMAIL_FROM) throw new AppError(503, 'EMAIL_NOT_CONFIGURED', 'Serviço de e-mail não configurado.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to: [email],
      subject: 'Seu código de acesso TroteBox',
      text: `Seu código de acesso TroteBox é ${code}. Ele expira em ${config.AUTH_CODE_TTL_MINUTES} minutos e só pode ser usado uma vez. Ignore esta mensagem se você não solicitou o acesso.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h1>Código de acesso TroteBox</h1><p>Use o código abaixo para entrar no seu espaço exclusivo:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>Ele expira em ${config.AUTH_CODE_TTL_MINUTES} minutos e só pode ser usado uma vez. Ignore esta mensagem se você não solicitou o acesso.</p></div>`
    }),
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new AppError(502, 'EMAIL_DELIVERY_FAILED', 'Não foi possível enviar o código de acesso.');
  return {};
}

export async function requestAuthCode(input: RequestAuthCodeInput, request: Request) {
  const email = input.email.toLowerCase();
  const ip = requestIp(request);

  // Anti-spam e anti-enumeração: um novo challenge por minuto por e-mail,
  // além de limites agregados por e-mail e IP.
  await enforceRateLimit('auth:request:email:60s', hashSubject(email), 1, 60 * 1000);
  await enforceRateLimit('auth:request:email:15m', hashSubject(email), 5, 15 * 60 * 1000);
  await enforceRateLimit('auth:request:ip:15m', hashSubject(ip), 20, 15 * 60 * 1000);

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
    const delivery = await deliverCode(email, code);
    return { accepted: true, ...delivery };
  } catch (cause) {
    await prisma.authCode.delete({ where: { id: authCode.id } }).catch(() => undefined);
    throw cause;
  }
}

export async function verifyAuthCode(input: VerifyAuthCodeInput, request: Request) {
  const email = input.email.toLowerCase();
  const ip = requestIp(request);

  await enforceRateLimit('auth:verify:email:15m', hashSubject(email), 10, 15 * 60 * 1000);
  await enforceRateLimit('auth:verify:ip:15m', hashSubject(ip), 50, 15 * 60 * 1000);

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
