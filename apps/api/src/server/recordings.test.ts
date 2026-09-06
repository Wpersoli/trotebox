import { describe, expect, it } from 'vitest';
import { recordingExpiresAt } from './recordings';

describe('recording retention', () => {
  it('anchors expiration to the call lifecycle instead of callback arrival time', () => {
    const anchor = new Date('2026-01-01T00:00:00.000Z');
    expect(recordingExpiresAt(anchor, 30).toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });

  it('uses exact 24-hour retention days across month boundaries', () => {
    const anchor = new Date('2026-02-20T12:30:00.000Z');
    expect(recordingExpiresAt(anchor, 10).toISOString()).toBe('2026-03-02T12:30:00.000Z');
  });
});
