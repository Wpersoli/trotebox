import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

const MAX_JSON_BODY_BYTES = 32 * 1024;

export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
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

export function handleError(cause: unknown) {
  const requestId = randomUUID();
  if (cause instanceof AppError) {
    const details = process.env.NODE_ENV === 'production' ? undefined : cause.details;
    if (cause.status >= 500) {
      console.error({ requestId, code: cause.code, status: cause.status, message: cause.message });
    }
    const isProductionServerError = process.env.NODE_ENV === 'production' && cause.status >= 500;
    return NextResponse.json({
      error: {
        code: cause.code,
        message: isProductionServerError ? 'Erro interno inesperado.' : cause.message,
        ...(details !== undefined ? { details } : {}),
        requestId
      }
    }, { status: cause.status });
  }
  if (cause instanceof ZodError) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos.', details: cause.flatten(), requestId } }, { status: 400 });
  }
  const error = cause instanceof Error ? cause : new Error('Unknown error');
  console.error({ requestId, name: error.name, message: error.message, stack: error.stack });
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno inesperado.', requestId } }, { status: 500 });
}

export async function jsonBody(request: Request) {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const declaredBytes = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declaredBytes) && declaredBytes > MAX_JSON_BODY_BYTES) {
      throw new AppError(413, 'REQUEST_BODY_TOO_LARGE', 'Corpo da requisição excede o limite permitido.');
    }
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BODY_BYTES) {
    throw new AppError(413, 'REQUEST_BODY_TOO_LARGE', 'Corpo da requisição excede o limite permitido.');
  }

  try { return JSON.parse(text) as unknown; }
  catch { throw new AppError(400, 'INVALID_JSON', 'Corpo JSON inválido.'); }
}
