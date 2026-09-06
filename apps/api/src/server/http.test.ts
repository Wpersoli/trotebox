import { describe, expect, it, vi } from 'vitest';
import { AppError, handleError, jsonBody, urlEncodedWebhookBody, webhookBody } from './http';

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

  it('propagates safe application response headers', async () => {
    const response = handleError(new AppError(
      429,
      'RATE_LIMITED',
      'Limite de uso atingido.',
      undefined,
      { 'Retry-After': '17' }
    ));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('17');
    const body = await response.json();
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.error).not.toHaveProperty('details');
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

  it('does not write raw infrastructure messages to production logs', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubEnv('NODE_ENV', 'production');

    try {
      const error = new Error('postgresql://user:top-secret@example.invalid/database');
      error.name = 'PrismaClientInitializationError';
      handleError(error);

      expect(JSON.stringify(log.mock.calls)).not.toContain('top-secret');
      expect(JSON.stringify(log.mock.calls)).not.toContain('example.invalid');
      expect(JSON.stringify(log.mock.calls)).toContain('PrismaClientInitializationError');
    } finally {
      vi.unstubAllEnvs();
      log.mockRestore();
    }
  });
});

describe('bounded request bodies', () => {
  it('parses normal JSON bodies', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    });
    await expect(jsonBody(request)).resolves.toEqual({ ok: true });
  });

  it('rejects JSON bodies over the 32 KiB application limit', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'x'.repeat(33 * 1024) })
    });
    await expect(jsonBody(request)).rejects.toMatchObject({ status: 413, code: 'REQUEST_BODY_TOO_LARGE' });
  });

  it('rejects webhook bodies over the 256 KiB hard limit', async () => {
    const request = new Request('http://localhost/api/webhook', {
      method: 'POST',
      body: 'x'.repeat(257 * 1024)
    });
    await expect(webhookBody(request)).rejects.toMatchObject({ status: 413, code: 'REQUEST_BODY_TOO_LARGE' });
  });

  it('parses bounded urlencoded provider callbacks and rejects unexpected media types', async () => {
    const request = new Request('http://localhost/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: 'CallSid=CA123&CallStatus=completed'
    });
    await expect(urlEncodedWebhookBody(request)).resolves.toEqual({
      rawBody: 'CallSid=CA123&CallStatus=completed',
      params: { CallSid: 'CA123', CallStatus: 'completed' }
    });

    const invalid = new Request('http://localhost/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=test' },
      body: 'test'
    });
    await expect(urlEncodedWebhookBody(invalid)).rejects.toMatchObject({ status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' });
  });
});
