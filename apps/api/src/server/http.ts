import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function handleError(cause: unknown) {
  const requestId = randomUUID();
  if (cause instanceof AppError) {
    // Nunca devolva payload bruto de provedores/infra em produção. Alguns
    // AppError carregam detalhes de upstream úteis apenas em desenvolvimento.
    const details = process.env.NODE_ENV === 'production' ? undefined : cause.details;
    if (cause.status >= 500) {
      console.error({ requestId, code: cause.code, status: cause.status, message: cause.message });
    }
    return NextResponse.json({
      error: {
        code: cause.code,
        message: cause.message,
        ...(details !== undefined ? { details } : {}),
        requestId
      }
    }, { status: cause.status });
  }
  if (cause instanceof ZodError) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos.', details: cause.flatten(), requestId } }, { status: 400 });
  }
  console.error({ requestId, cause });
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno inesperado.', requestId } }, { status: 500 });
}

export async function jsonBody(request: Request) {
  try { return await request.json() as unknown; }
  catch { throw new AppError(400, 'INVALID_JSON', 'Corpo JSON inválido.'); }
}
