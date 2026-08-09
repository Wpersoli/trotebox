import { LedgerType, PaymentProvider, PaymentStatus, Prisma, prisma } from '@trotebox/db';
import { AppError } from './http';

type Settlement = {
  provider: PaymentProvider;
  amountCents: number;
  currency: string;
};

export async function approvePaymentByInternalId(
  paymentId: string,
  providerPaymentId: string | undefined,
  rawStatus: string,
  settlement: Settlement
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Pagamento não encontrado.');
    if (payment.provider !== settlement.provider) throw new AppError(409, 'PAYMENT_PROVIDER_MISMATCH', 'O provedor não corresponde ao pagamento interno.');
    if (payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.CHARGEBACK) {
      throw new AppError(409, 'PAYMENT_REVOKED', 'Pagamento já revogado e não pode ser creditado.');
    }
    if (payment.amountCents !== settlement.amountCents || payment.currency.toUpperCase() !== settlement.currency.toUpperCase()) {
      throw new AppError(409, 'PAYMENT_AMOUNT_MISMATCH', 'Valor ou moeda divergente no pagamento confirmado.');
    }

    const existingLedger = await tx.ledgerEntry.findUnique({ where: { type_referenceType_referenceId: { type: LedgerType.PURCHASE, referenceType: 'PAYMENT', referenceId: payment.id } } });
    if (payment.status === PaymentStatus.APPROVED && existingLedger) return payment;

    const wallet = await tx.walletAccount.upsert({ where: { userId: payment.userId }, update: {}, create: { userId: payment.userId } });
    const current = existingLedger ? wallet : await tx.walletAccount.update({ where: { id: wallet.id }, data: { balanceCredits: { increment: payment.credits }, version: { increment: 1 } } });
    if (!existingLedger) {
      await tx.ledgerEntry.create({ data: {
        walletId: wallet.id, type: LedgerType.PURCHASE, amountCredits: payment.credits,
        balanceAfter: current.balanceCredits, reservedAfter: current.reservedCredits,
        referenceType: 'PAYMENT', referenceId: payment.id, description: `Compra de ${payment.credits} créditos`
      }});
    }
    return tx.payment.update({ where: { id: payment.id }, data: {
      status: PaymentStatus.APPROVED,
      providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
      rawStatus,
      approvedAt: payment.approvedAt ?? new Date()
    }});
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function revokePaymentCredits(providerPaymentId: string, reason: 'REFUND' | 'CHARGEBACK') {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { providerPaymentId } });
    if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Pagamento não encontrado pelo provedor.');

    const priorRevocation = await tx.ledgerEntry.findFirst({
      where: { referenceType: 'PAYMENT', referenceId: payment.id, type: { in: [LedgerType.REFUND, LedgerType.CHARGEBACK] } }
    });
    if (priorRevocation) return payment;

    const purchase = await tx.ledgerEntry.findUnique({ where: { type_referenceType_referenceId: { type: LedgerType.PURCHASE, referenceType: 'PAYMENT', referenceId: payment.id } } });
    if (purchase) {
      const ledgerType = reason === 'REFUND' ? LedgerType.REFUND : LedgerType.CHARGEBACK;
      const wallet = await tx.walletAccount.upsert({ where: { userId: payment.userId }, update: {}, create: { userId: payment.userId } });
      const current = await tx.walletAccount.update({ where: { id: wallet.id }, data: { balanceCredits: { decrement: payment.credits }, version: { increment: 1 } } });
      await tx.ledgerEntry.create({ data: {
        walletId: wallet.id, type: ledgerType, amountCredits: -payment.credits,
        balanceAfter: current.balanceCredits, reservedAfter: current.reservedCredits,
        referenceType: 'PAYMENT', referenceId: payment.id,
        description: reason === 'REFUND' ? 'Créditos revogados por reembolso' : 'Créditos revogados por contestação'
      }});
    }

    if (reason === 'CHARGEBACK') {
      await tx.user.update({ where: { id: payment.userId }, data: { status: 'SUSPENDED' } });
    }
    return tx.payment.update({ where: { id: payment.id }, data: {
      status: reason === 'REFUND' ? PaymentStatus.REFUNDED : PaymentStatus.CHARGEBACK,
      refundedAt: reason === 'REFUND' ? new Date() : payment.refundedAt,
      rawStatus: reason.toLowerCase()
    }});
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updatePaymentFromMercadoPago(payload: Record<string, any>) {
  const internalId = String(payload.external_reference ?? '');
  if (!internalId) throw new AppError(400, 'MISSING_EXTERNAL_REFERENCE', 'Pagamento sem referência interna.');
  const status = String(payload.status ?? '');
  const providerId = String(payload.id ?? '');
  if (status === 'approved') {
    const amountCents = Math.round(Number(payload.transaction_amount) * 100);
    const currency = String(payload.currency_id ?? '');
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || !currency) throw new AppError(409, 'INVALID_SETTLEMENT', 'Liquidação Mercado Pago sem valor ou moeda válidos.');
    return approvePaymentByInternalId(internalId, providerId, status, {
      provider: PaymentProvider.MERCADOPAGO,
      amountCents,
      currency
    });
  }

  const current = await prisma.payment.findUnique({ where: { id: internalId } });
  if (!current) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Pagamento não encontrado.');
  if (current.provider !== PaymentProvider.MERCADOPAGO) throw new AppError(409, 'PAYMENT_PROVIDER_MISMATCH', 'Pagamento não pertence ao Mercado Pago.');
  if ((status === 'refunded' || status === 'charged_back') && current.providerPaymentId) {
    return revokePaymentCredits(current.providerPaymentId, status === 'refunded' ? 'REFUND' : 'CHARGEBACK');
  }
  const mapped = status === 'rejected' ? PaymentStatus.REJECTED : status === 'cancelled' ? PaymentStatus.CANCELED : PaymentStatus.PENDING;
  return prisma.payment.update({ where: { id: internalId }, data: { status: mapped, providerPaymentId: providerId || current.providerPaymentId, rawStatus: status } });
}
