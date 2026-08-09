import { createHmac, randomInt } from 'node:crypto';
import { Prisma, prisma } from '@trotebox/db';
import type { RequestAuthCodeInput, VerifyAuthCodeInput } from '@trotebox/contracts';
import { env } from './env';
import { hashSubject, safeEqualHex } from './crypto';
import { AppError } from './http';
import { enforceRateLimit } from './rate-limit';

function codeHash(email: string, code: string) {
  return createHmac('sha256', env().AUTH_CODE_PEPPER).update(`${email}:${code}`).digest('hex');
}

async function deliverCode(email: string, displayName: string, code: string) {
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
      subject: 'Seu código de acesso',
      text: `Olá, ${displayName}. Seu código de acesso é ${code}. Ele expira em ${config.AUTH_CODE_TTL_MINUTES} minutos.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h1>Código de acesso</h1><p>Olá, ${escapeHtml(displayName)}.</p><p>Use o código abaixo para entrar:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>Ele expira em ${config.AUTH_CODE_TTL_MINUTES} minutos. Ignore esta mensagem se você não solicitou o acesso.</p></div>`
    }),
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new AppError(502, 'EMAIL_DELIVERY_FAILED', 'Não foi possível enviar o código de acesso.');
  return {};
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

export async function requestAuthCode(input: RequestAuthCodeInput, request: Request) {
  const email = input.email.toLowerCase();
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  await enforceRateLimit('auth:email:15m', hashSubject(email), 5, 15 * 60 * 1000);
  await enforceRateLimit('auth:ip:15m', hashSubject(forwarded), 20, 15 * 60 * 1000);

  const code = String(randomInt(100000, 1_000_000));
  const authCode = await prisma.authCode.create({ data: {
    email,
    displayName: input.displayName,
    codeHash: codeHash(email, code),
    expiresAt: new Date(Date.now() + env().AUTH_CODE_TTL_MINUTES * 60 * 1000)
  }});

  try {
    const delivery = await deliverCode(email, input.displayName, code);
    return { accepted: true, ...delivery };
  } catch (cause) {
    await prisma.authCode.delete({ where: { id: authCode.id } }).catch(() => undefined);
    throw cause;
  }
}

export async function verifyAuthCode(input: VerifyAuthCodeInput) {
  const email = input.email.toLowerCase();
  const authCode = await prisma.authCode.findFirst({
    where: { email, consumedAt: null },
    orderBy: { createdAt: 'desc' }
  });
  if (!authCode || authCode.expiresAt <= new Date() || authCode.attempts >= 5) {
    throw new AppError(401, 'INVALID_AUTH_CODE', 'Código inválido ou expirado.');
  }

  if (!safeEqualHex(authCode.codeHash, codeHash(email, input.code))) {
    await prisma.authCode.update({ where: { id: authCode.id }, data: { attempts: { increment: 1 } } });
    throw new AppError(401, 'INVALID_AUTH_CODE', 'Código inválido ou expirado.');
  }

  return prisma.$transaction(async (tx) => {
    const consumed = await tx.authCode.updateMany({ where: { id: authCode.id, consumedAt: null }, data: { consumedAt: new Date() } });
    if (consumed.count !== 1) throw new AppError(409, 'AUTH_CODE_ALREADY_USED', 'Código já utilizado.');

    const existing = await tx.user.findUnique({ where: { email } });
    if (existing && existing.status !== 'ACTIVE') throw new AppError(403, 'ACCOUNT_DISABLED', 'Conta indisponível.');
    const user = await tx.user.upsert({
      where: { email },
      update: { displayName: authCode.displayName },
      create: { email, displayName: authCode.displayName }
    });
    await tx.walletAccount.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    return user;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
