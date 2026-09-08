import { afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma, prisma } from '@trotebox/db';
import { createPix } from './mercadopago';

vi.mock('../env', () => ({ env: () => ({ MERCADOPAGO_ACCESS_TOKEN: 'test-token', MERCADOPAGO_WEBHOOK_SECRET: 'test-secret' }) }));

const pack = { id: 'pack', code: 'starter', name: 'Pacote', priceCents: 2990, credits: 15, currency: 'BRL' };
const payment = { id: 'payment', userId: 'owner', provider: 'MERCADOPAGO', providerPaymentId: null, amountCents: 1490, credits: 5, creditPack: pack };

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function provider() {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 123, status: 'pending', point_of_interaction: { transaction_data: { qr_code: 'pix' } } })));
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(prisma.payment, 'update').mockResolvedValue(payment as never);
  vi.spyOn(prisma.creditPack, 'findFirst').mockResolvedValue(pack as never);
  return fetchMock;
}

describe('Pix idempotency and price snapshots', () => {
  it('keeps the original amount and credits when a pack changes before retry', async () => {
    const fetchMock = provider();
    vi.spyOn(prisma.payment, 'findUnique').mockResolvedValue(payment as never);
    await createPix('owner', 'starter', 'test@example.test', 'same-key');
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.transaction_amount).toBe(14.90);
    expect(body.description).toContain('5 créditos');
    expect(body.external_reference).toBe('payment');
  });

  it('recovers the winning payment after a concurrent insert without a generic 500', async () => {
    provider();
    vi.spyOn(prisma.payment, 'findUnique').mockResolvedValueOnce(null).mockResolvedValueOnce(payment as never);
    vi.spyOn(prisma.payment, 'create').mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));
    await expect(createPix('owner', 'starter', 'test@example.test', 'same-key')).resolves.toMatchObject({ internalPaymentId: 'payment' });
  });

  it('rejects a concurrent key owned by a different account before contacting the provider', async () => {
    const fetchMock = provider();
    vi.spyOn(prisma.payment, 'findUnique').mockResolvedValueOnce(null).mockResolvedValueOnce({ ...payment, userId: 'someone-else' } as never);
    vi.spyOn(prisma.payment, 'create').mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));
    await expect(createPix('owner', 'starter', 'test@example.test', 'same-key')).rejects.toMatchObject({ status: 409 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
