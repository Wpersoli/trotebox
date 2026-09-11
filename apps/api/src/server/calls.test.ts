import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CallStatus, Prisma, prisma } from '@trotebox/db';
import { createCall, persistProviderStart } from './calls';
import { telephonyProvider } from './telephony';
import { prepareVoiceAsset } from './voice';
import { releaseCreditsInTransaction } from './wallet';

vi.mock('./env', () => ({ env: () => ({ PUBLIC_API_URL: 'https://api.example.test', TELEPHONY_PROVIDER: 'twilio', RECORDING_ENABLED: false }) }));
vi.mock('./crypto', () => ({ encrypt: () => 'encrypted', hashSubject: () => 'phone-hash' }));
vi.mock('./phone-policy', () => ({ validateRecipient: (phone: string) => phone }));
vi.mock('./rate-limit', () => ({ enforceRateLimits: vi.fn() }));
vi.mock('./wallet', () => ({ reserveCredits: vi.fn(), releaseCreditsInTransaction: vi.fn(), captureCreditsInTransaction: vi.fn() }));
vi.mock('./telephony', () => ({ telephonyProvider: vi.fn() }));
vi.mock('./audit', () => ({ audit: vi.fn() }));
vi.mock('./capabilities', () => ({ platformCapabilities: () => ({ outboundCalls: true }) }));
vi.mock('./voice', () => ({ prepareVoiceAsset: vi.fn() }));

const script = { id: 'script', active: true, creditCost: 3 };
const input = { scriptId: 'script', recipientPhone: '+5511999999999', consentConfirmed: true as const, recordingConsentConfirmed: false, idempotencyKey: 'key' };
const request = new Request('https://api.example.test/calls');
const order = () => ({ id: 'call', userId: 'user', scriptId: 'script', recipientPhoneHash: 'phone-hash', recordingConsentAt: null, providerCallId: null as string | null, status: CallStatus.CREDIT_RESERVED as CallStatus, reservedCredits: 3 });

afterEach(() => vi.restoreAllMocks());
beforeEach(() => vi.clearAllMocks());

describe('call dispatch safety', () => {
  it('returns the concurrent winner without dispatching again', async () => {
    const winner = { ...order(), providerCallId: 'already-started', status: CallStatus.DIALING };
    vi.spyOn(prisma.callOrder, 'findUnique').mockResolvedValueOnce(null).mockResolvedValue(winner as never);
    vi.spyOn(prisma.suppression, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.script, 'findUnique').mockResolvedValue(script as never);
    vi.spyOn(prisma, '$transaction').mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '6.12.0' }));
    await expect(createCall('user', input, request)).resolves.toEqual(winner);
    expect(telephonyProvider).not.toHaveBeenCalled();
    expect(releaseCreditsInTransaction).not.toHaveBeenCalled();
  });

  it('rejects reuse with a different recording authorization', async () => {
    vi.spyOn(prisma.callOrder, 'findUnique').mockResolvedValue({ ...order(), recordingConsentAt: new Date() } as never);
    await expect(createCall('user', input, request)).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect(telephonyProvider).not.toHaveBeenCalled();
  });

  it.each([CallStatus.COMPLETED, CallStatus.FAILED, CallStatus.ANSWERED])('never regresses %s after a delayed provider response', async (status) => {
    const current = { ...order(), status, providerCallId: 'provider' };
    const update = vi.fn(async ({ data }) => ({ ...current, ...data }));
    const tx = { callOrder: { findUniqueOrThrow: vi.fn().mockResolvedValue(current), update }, callEvent: { upsert: vi.fn() } };
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb) => cb(tx as never) as never);
    await expect(persistProviderStart('call', 'provider')).resolves.toMatchObject({ status });
    expect(update.mock.calls[0]?.[0].data.status).toBeUndefined();
  });

  it('rejects a second provider identifier', async () => {
    const tx = { callOrder: { findUniqueOrThrow: vi.fn().mockResolvedValue({ ...order(), providerCallId: 'first' }) } };
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb) => cb(tx as never) as never);
    await expect(persistProviderStart('call', 'second')).rejects.toMatchObject({ code: 'PROVIDER_CALL_CONFLICT' });
  });

  it('keeps a reservation when the provider response is lost', async () => {
    const current = order();
    const update = vi.fn(async ({ data }) => Object.assign(current, data));
    const tx = { callOrder: { create: vi.fn().mockResolvedValue(current), update }, callEvent: { create: vi.fn() } };
    vi.spyOn(prisma.callOrder, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.callOrder, 'update').mockImplementation(update as never);
    vi.spyOn(prisma.suppression, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.script, 'findUnique').mockResolvedValue(script as never);
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb) => cb(tx as never) as never);
    vi.mocked(prepareVoiceAsset).mockResolvedValue(undefined);
    const startCall = vi.fn().mockRejectedValue(new Error('response lost'));
    vi.mocked(telephonyProvider).mockResolvedValue({ startCall });
    await expect(createCall('user', input, request)).rejects.toMatchObject({ code: 'CALL_RECONCILIATION_PENDING' });
    expect(current.status).toBe(CallStatus.QUEUED);
    expect(startCall).toHaveBeenCalledTimes(1);
    expect(releaseCreditsInTransaction).not.toHaveBeenCalled();
  });
});
