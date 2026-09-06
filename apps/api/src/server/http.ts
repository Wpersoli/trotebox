import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

const MAX_JSON_BODY_BYTES = 32 * 1024;
export const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
    public headers?: Record<string, string>
  ) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function okPublic<T>(data: T, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
    }
  });
}

function isDatabaseConnectivityError(cause: unknown) {
  if (!(cause instanceof Error)) return false;
  const errorCode = 'errorCode' in cause && typeof cause.errorCode === 'string' ? cause.errorCode : '';
  if (['P1000', 'P1001', 'P1002', 'P1010'].includes(errorCode)) return true;

  const message = cause.message.toLowerCase();
  return message.includes('ecircuitbreaker')
    || message.includes('too many authentication failures')
    || message.includes('password authentication failed')
    || message.includes("can't reach database server")
    || message.includes('timed out');
}

function safeErrorLog(error: Error) {
  const fields: { name: string; errorCode?: string; message?: string } = { name: error.name };
  const errorCode = 'errorCode' in error && typeof error.errorCode === 'string'
    ? error.errorCode
    : 'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined;
  if (errorCode) fields.errorCode = errorCode;
  if (process.env.NODE_ENV !== 'production') fields.message = error.message;
  return fields;
}

export function handleError(cause: unknown) {
  const requestId = randomUUID();
  if (cause instanceof AppError) {
    const details = process.env.NODE_ENV === 'production' ? undefined : cause.details;
    if (cause.status >= 500) {
      console.error({
        requestId,
        code: cause.code,
        status: cause.status,
        ...(process.env.NODE_ENV === 'production' ? {} : { message: cause.message })
      });
    }
    const isProductionServerError = process.env.NODE_ENV === 'production' && cause.status >= 500;
    return NextResponse.json({
      error: {
        code: cause.code,
        message: isProductionServerError ? 'Erro interno inesperado.' : cause.message,
        ...(details !== undefined ? { details } : {}),
        requestId
      }
    }, { status: cause.status, headers: cause.headers });
  }
  if (cause instanceof ZodError) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos.', details: cause.flatten(), requestId } }, { status: 400 });
  }

  if (isDatabaseConnectivityError(cause)) {
    const error = cause instanceof Error ? cause : new Error('Database unavailable');
    console.error({ requestId, code: 'DATABASE_UNAVAILABLE', status: 503, ...safeErrorLog(error) });
    return NextResponse.json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: process.env.NODE_ENV === 'production'
          ? 'Dependência de banco de dados indisponível.'
          : 'Banco de dados indisponível ou credenciais inválidas.',
        requestId
      }
    }, { status: 503, headers: { 'Retry-After': '30' } });
  }

  const error = cause instanceof Error ? cause : new Error('Unknown error');
  console.error({ requestId, ...safeErrorLog(error) });
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno inesperado.', requestId } }, { status: 500 });
}

function assertDeclaredBodySize(request: Request, maxBytes: number) {
  const contentLength = request.headers.get('content-length');
  if (!contentLength) return;
  const declaredBytes = Number.parseInt(contentLength, 10);
  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
    throw new AppError(413, 'REQUEST_BODY_TOO_LARGE', 'Corpo da requisição excede o limite permitido.');
  }
}

export async function textBody(request: Request, maxBytes: number) {
  assertDeclaredBodySize(request, maxBytes);
  if (!request.body) return '';

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel('request body too large').catch(() => undefined);
        throw new AppError(413, 'REQUEST_BODY_TOO_LARGE', 'Corpo da requisição excede o limite permitido.');
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

export async function webhookBody(request: Request) {
  return textBody(request, MAX_WEBHOOK_BODY_BYTES);
}

export async function urlEncodedWebhookBody(request: Request) {
  const mediaType = (request.headers.get('content-type') ?? '').split(';', 1)[0]?.trim().toLowerCase();
  if (mediaType && mediaType !== 'application/x-www-form-urlencoded') {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Formato de webhook não suportado.');
  }
  const rawBody = await webhookBody(request);
  return {
    rawBody,
    params: Object.fromEntries(new URLSearchParams(rawBody).entries())
  };
}

export async function jsonBody(request: Request) {
  const text = await textBody(request, MAX_JSON_BODY_BYTES);
  try { return JSON.parse(text) as unknown; }
  catch { throw new AppError(400, 'INVALID_JSON', 'Corpo JSON inválido.'); }
}
