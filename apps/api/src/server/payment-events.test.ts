import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaymentProvider, PaymentStatus, prisma } from '@trotebox/db';
import { approvePaymentByInternalId, updatePaymentFromMercadoPago } from './payment-events';

afterEach(() => vi.restoreAllMocks());

describe('payment settlement state transitions', () => {
  it.each([PaymentStatus.REJECTED, PaymentStatus.CANCELED, PaymentStatus.REFUNDED, PaymentStatus.CHARGEBACK])(
    'rejects a late approval for %s payments',
    async (status) => {
      const tx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'payment',
            provider: PaymentProvider.MERCADOPAGO,
            status,
            providerPaymentId: 'provider-payment',
            amountCents: 1490,
            currency: 'BRL',
            credits: 5,
            userId: 'user'
          })
        }
      };
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback) => callback(tx as never) as never);

      await expect(approvePaymentByInternalId(
        'payment',
        'provider-payment',
        'approved',
        { provider: PaymentProvider.MERCADOPAGO, amountCents: 1490, currency: 'BRL' }
      )).rejects.toMatchObject({ status: 409, code: 'PAYMENT_NOT_SETTLEABLE' });
    }
  );

  it('does not downgrade an approved payment when an older pending event arrives', async () => {
    const payment = {
      id: 'payment',
      provider: PaymentProvider.MERCADOPAGO,
      status: PaymentStatus.APPROVED,
      providerPaymentId: 'provider-payment'
    };
    const findUnique = vi.spyOn(prisma.payment, 'findUnique').mockResolvedValue(payment as never);
    const update = vi.spyOn(prisma.payment, 'update');

    await expect(updatePaymentFromMercadoPago({
      external_reference: 'payment',
      id: 'provider-payment',
      status: 'pending'
    })).resolves.toEqual(payment);

    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'payment' } });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a provider event whose payment id differs from the internal record', async () => {
    const payment = {
      id: 'payment',
      provider: PaymentProvider.MERCADOPAGO,
      status: PaymentStatus.PENDING,
      providerPaymentId: 'expected-provider-payment'
    };
    vi.spyOn(prisma.payment, 'findUnique').mockResolvedValue(payment as never);
    const update = vi.spyOn(prisma.payment, 'update');

    await expect(updatePaymentFromMercadoPago({
      external_reference: 'payment',
      id: 'different-provider-payment',
      status: 'pending'
    })).rejects.toMatchObject({ status: 409, code: 'PAYMENT_PROVIDER_ID_MISMATCH' });

    expect(update).not.toHaveBeenCalled();
  });
});


describe('concurrent payment updates', () => {
  it('does not overwrite an approval committed after the pending read', async () => {
    const pending = { id: 'payment', provider: PaymentProvider.MERCADOPAGO, status: PaymentStatus.PENDING, providerPaymentId: 'provider-payment' };
    const approved = { ...pending, status: PaymentStatus.APPROVED };
    vi.spyOn(prisma.payment, 'findUnique').mockResolvedValue(pending as never);
    const updateMany = vi.spyOn(prisma.payment, 'updateMany').mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.payment, 'findUniqueOrThrow').mockResolvedValue(approved as never);
    await expect(updatePaymentFromMercadoPago({ external_reference: 'payment', id: 'provider-payment', status: 'rejected' })).resolves.toEqual(approved);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 'payment', status: PaymentStatus.PENDING, providerPaymentId: 'provider-payment' }, data: { status: PaymentStatus.REJECTED, providerPaymentId: 'provider-payment', rawStatus: 'rejected' } });
  });
});
