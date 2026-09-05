import { describe, expect, it } from 'vitest';
import { AppError, handleError } from './http';

describe('HTTP error handling', () => {
  it('maps database authentication/circuit-breaker failures to a retryable dependency error', async () => {
    const error = new Error('FATAL: (ECIRCUITBREAKER) too many authentication failures, new connections are temporarily blocked');
    error.name = 'PrismaClientInitializationError';

    const response = handleError(error);
    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe('30');

    const body = await response.json();
    expect(body.error.code).toBe('DATABASE_UNAVAILABLE');
    expect(body.error.message).toBe('Banco de dados indisponível ou credenciais inválidas.');
    expect(body.error.requestId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('does not misclassify non-database Prisma initialization failures', async () => {
    const error = new Error('Query engine binary for current platform could not be found');
    error.name = 'PrismaClientInitializationError';

    const response = handleError(error);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Erro interno inesperado.');
  });

  it('keeps application errors and their status codes intact', async () => {
    const response = handleError(new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Conflito de idempotência.'));
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(body.error.message).toBe('Conflito de idempotência.');
  });

  it('never returns the underlying error object for unknown failures', async () => {
    const error = new Error('connection secret should never reach the client');
    const response = handleError(error);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Erro interno inesperado.');
    expect(JSON.stringify(body)).not.toContain('connection secret should never reach the client');
  });
});
