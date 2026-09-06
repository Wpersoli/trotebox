import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, parseRetryAfterSeconds } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Retry-After handling', () => {
  it('parses both delta-seconds and HTTP dates', () => {
    expect(parseRetryAfterSeconds('17', 0)).toBe(17);
    expect(parseRetryAfterSeconds('Thu, 01 Jan 1970 00:01:00 GMT', 0)).toBe(60);
    expect(parseRetryAfterSeconds('invalid', 0)).toBeUndefined();
  });

  it('surfaces an actionable wait time for API rate limits', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: { code: 'RATE_LIMITED' } }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '17'
        }
      }
    )));

    let caught: unknown;
    try {
      await api.catalog();
    } catch (cause) {
      caught = cause;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      retryAfterSeconds: 17,
      message: 'Limite de uso atingido. Tente novamente em 17 segundos.'
    });
  });
});
