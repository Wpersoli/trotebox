import { CallStatus, PaymentProvider, PaymentStatus, Prisma, prisma } from '@trotebox/db';
import { env } from '@/server/env';
import { AppError, handleError, ok } from '@/server/http';
import { releaseCreditsInTransaction } from '@/server/wallet';
import { getMercadoPagoPayment } from '@/server/payments/mercadopago';
import { updatePaymentFromMercadoPago } from '@/server/payment-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const expirable: CallStatus[] = [CallStatus.CREDIT_RESERVED, CallStatus.QUEUED, CallStatus.DIALING, CallStatus.RINGING];

export async function GET(request: Request) {
  try {
    const configured = env().CRON_SECRET;
    if (!configured || request.headers.get('authorization') !== `Bearer ${configured}`) throw new AppError(401, 'INVALID_CRON_SECRET', 'Não autorizado.');
    const staleBefore = new Date(Date.now() - 30 * 60 * 1000);
    const stale = await prisma.callOrder.findMany({ where: { status: { in: expirable }, updatedAt: { lt: staleBefore } }, take: 100, select: { id: true } });
    let reconciledCalls = 0;

    for (const item of stale) {
      const reconciled = await prisma.$transaction(async (tx) => {
        const call = await tx.callOrder.findUnique({ where: { id: item.id } });
        if (!call || !expirable.includes(call.status) || call.updatedAt >= staleBefore) return false;
        await releaseCreditsInTransaction(tx, call.userId, call.reservedCredits, call.id, 'Liberação por expiração operacional');
        await tx.callOrder.update({ where: { id: call.id }, data: { status: CallStatus.EXPIRED, failureCode: 'STALE_TIMEOUT' } });
        await tx.callEvent.create({ data: { callId: call.id, providerEventId: `cron:expired:${call.id}`, status: CallStatus.EXPIRED } });
        return true;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (reconciled) reconciledCalls += 1;
    }

    const pendingPayments = await prisma.payment.findMany({
      where: {
        provider: PaymentProvider.MERCADOPAGO,
        status: PaymentStatus.PENDING,
        providerPaymentId: { not: null }
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
      select: { id: true, providerPaymentId: true }
    });
    let reconciledPayments = 0;
    for (const payment of pendingPayments) {
      if (!payment.providerPaymentId) continue;
      try {
        const providerPayment = await getMercadoPagoPayment(payment.providerPaymentId);
        await updatePaymentFromMercadoPago(providerPayment, { internalPaymentId: payment.id, providerPaymentId: payment.providerPaymentId });
        reconciledPayments += 1;
      } catch {
        // Mantém PENDING para a próxima rodada; o webhook/consulta do cliente
        // pode reconciliar antes do próximo cron.
      }
    }

    await prisma.rateLimitEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } } });
    await prisma.idempotencyRecord.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await prisma.authCode.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
    await prisma.$executeRaw`DELETE FROM "Session" WHERE "expiresAt" < NOW() - INTERVAL '24 hours'`;
    return ok({ reconciledCalls, reconciledPayments });
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2034') {
      return handleError(new AppError(409, 'RECONCILIATION_RETRY', 'Conflito transitório; a próxima execução tentará novamente.'));
    }
    return handleError(cause);
  }
}
