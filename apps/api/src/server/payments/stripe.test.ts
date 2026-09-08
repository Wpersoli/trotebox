import { afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma, prisma } from '@trotebox/db';
import { createStripeCheckout } from './stripe';

const stripeMocks = vi.hoisted(() => ({
  sessionsCreate: vi.fn(),
  sessionsRetrieve: vi.fn()
}));

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    checkout: {
      sessions: {
        create: stripeMocks.sessionsCreate,
        retrieve: stripeMocks.sessionsRetrieve
      }
    },
    webhooks: { constructEvent: vi.fn() },
    charges: { retrieve: vi.fn() }
  }))
}));

vi.mock('../env', () => ({ env: () => ({ STRIPE_SECRET_KEY: 'sk_test', PUBLIC_WEB_URL: 'https://web.example.test' }) }));

const pack = { id: 'pack', code: 'starter', name: 'Pacote', priceCents: 1490, credits: 5, currency: 'BRL', stripePriceId: null };
const payment = {
  id: 'payment',
  userId: 'owner',
  creditPackId: 'pack',
  provider: 'STRIPE',
  status: 'PENDING',
  amountCents: 1490,
  currency: 'BRL',
  credits: 5,
  idempotencyKey: 'same-key',
  providerCheckoutId: null,
  creditPack: pack
};

afterEach(() => {
  vi.restoreAllMocks();
  stripeMocks.sessionsCreate.mockReset();
  stripeMocks.sessionsRetrieve.mockReset();
});

function providerSession() {
  stripeMocks.sessionsCreate.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.test/session' });
  vi.spyOn(prisma.creditPack, 'findFirst').mockResolvedValue(pack as never);
  vi.spyOn(prisma.user, 'findUniqueOrThrow').mockResolvedValue({ id: 'owner', email: 'owner@example.test' } as never);
  vi.spyOn(prisma.payment, 'update').mockResolvedValue({ ...payment, providerCheckoutId: 'cs_test' } as never);
}

describe('Stripe checkout idempotency and price snapshots', () => {
  it('recovers the winning payment after a concurrent insert without a generic 500', async () => {
    providerSession();
    vi.spyOn(prisma.payment, 'findUnique').mockResolvedValueOnce(null).mockResolvedValueOnce(payment as never);
    vi.spyOn(prisma.payment, 'create').mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));

    await expect(createStripeCheckout('owner', 'starter', 'same-key')).resolves.toMatchObject({ checkoutUrl: 'https://checkout.stripe.test/session' });
    expect(stripeMocks.sessionsCreate).toHaveBeenCalledTimes(1);
  });

  it('uses the original package snapshot when the catalog package is no longer active', async () => {
    providerSession();
    const findPack = vi.spyOn(prisma.creditPack, 'findFirst');
    vi.spyOn(prisma.payment, 'findUnique').mockResolvedValue(payment as never);

    await expect(createStripeCheckout('owner', 'starter', 'same-key')).resolves.toMatchObject({ checkoutUrl: 'https://checkout.stripe.test/session' });
    expect(findPack).not.toHaveBeenCalled();
  });

  it('rejects a concurrent key owned by a different account before contacting Stripe', async () => {
    providerSession();
    vi.spyOn(prisma.payment, 'findUnique').mockResolvedValueOnce(null).mockResolvedValueOnce({ ...payment, userId: 'someone-else' } as never);
    vi.spyOn(prisma.payment, 'create').mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));

    await expect(createStripeCheckout('owner', 'starter', 'same-key')).rejects.toMatchObject({ status: 409, code: 'IDEMPOTENCY_CONFLICT' });
    expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
  });
});
