import { describe, expect, it, vi } from 'vitest';
import { requestIp } from './request-ip';

describe('requestIp', () => {
  it('prefers the Vercel-owned client header over proxy-controlled fallbacks', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-vercel-forwarded-for': '203.0.113.10',
        'x-vercel-id': 'iad1::abc',
        'x-forwarded-for': '198.51.100.20',
        'x-real-ip': '198.51.100.21'
      }
    });

    expect(requestIp(request)).toBe('203.0.113.10');
  });

  it('accepts the first valid address in a forwarded chain', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': 'not-an-ip, 2001:db8::10, 198.51.100.20' }
    });

    expect(requestIp(request)).toBe('2001:db8::10');
  });

  it('falls back to x-real-ip when forwarded values are malformed', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': 'not-an-ip',
        'x-real-ip': '198.51.100.30'
      }
    });

    expect(requestIp(request)).toBe('198.51.100.30');
  });

  it('returns undefined instead of trusting malformed or missing headers', () => {
    expect(requestIp(new Request('http://localhost', {
      headers: { 'x-forwarded-for': 'not-an-ip', 'x-real-ip': 'also-not-an-ip' }
    }))).toBeUndefined();
    expect(requestIp()).toBeUndefined();
  });

  it('fails closed in production when the Vercel origin marker is unavailable', () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      expect(requestIp(new Request('http://localhost', {
        headers: { 'x-forwarded-for': '198.51.100.40' }
      }))).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
