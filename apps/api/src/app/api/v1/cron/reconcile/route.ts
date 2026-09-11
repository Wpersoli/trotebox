import { CallStatus, PaymentProvider, PaymentStatus, Prisma, prisma } from '@trotebox/db';
import { env } from '@/server/env';
import { AppError, handleError, ok } from '@/server/http';
import { applyCallStatus } from '@/server/calls';
import { readProviderCallStatus } from '@/server/telephony/reconcile';
import { getMercadoPagoPayment } from '@/server/payments/mercadopago';
import { updatePaymentFromMercadoPago } from '@/server/payment-events';
import { purgeExpiredRecordings } from '@/server/recordings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const expirable: CallStatus[] = [CallStatus.CREDIT_RESERVED, CallStatus.QUEUED, CallStatus.DIALING, CallStatus.RINGING, CallStatus.ANSWERED, CallStatus.RECORDING_PROCESSING];

export async function GET(request: Request) {
  try {
    const configured = env().CRON_SECRET;
    if (!configured || request.headers.get('authorization') !== `Bearer ${configured}`) throw new AppError(401, 'INVALID_CRON_SECRET', 'Não autorizado.');
    const staleBefore = new Date(Date.now() - 30 * 60 * 1000);
    const stale = await prisma.callOrder.findMany({
      where: { status: { in: expirable }, updatedAt: { lt: staleBefore } },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], take: 10,
      select: { id: true, providerCallId: true, telephonyProvider: true, updatedAt: true }
    });
    let reconciledCalls = 0;
    let callsNeedingReview = 0;
    for (const call of stale) {
      // Rotate the batch even if this provider is unavailable. Never infer a
      // failed call from missing callbacks, a timeout, or a provider 404.
      await prisma.callOrder.updateMany({ where: { id: call.id, updatedAt: call.updatedAt }, data: { updatedAt: new Date() } });
      if (!call.providerCallId) { callsNeedingReview += 1; continue; }
      try {
        const status = await readProviderCallStatus(call.telephonyProvider, call.providerCallId);
        if (!status) { callsNeedingReview += 1; continue; }
        await applyCallStatus({ providerCallId: call.providerCallId, status, providerEventId: `reconcile:${call.providerCallId}:${status}` });
        reconciledCalls += 1;
      } catch { callsNeedingReview += 1; }
    }
    if (callsNeedingReview) console.warn('call_reconciliation_pending', { count: callsNeedingReview });

    const pendingPayments = await prisma.payment.findMany({
      where: {
        provider: PaymentProvider.MERCADOPAGO,
        status: PaymentStatus.PENDING,
        providerPaymentId: { not: null }
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: 10,
      select: { id: true, providerPaymentId: true, updatedAt: true }
    });
    let reconciledPayments = 0;
    let pendingPaymentRetries = 0;
    for (const payment of pendingPayments) {
      if (!payment.providerPaymentId) continue;
      await prisma.payment.updateMany({ where: { id: payment.id, updatedAt: payment.updatedAt }, data: { updatedAt: new Date() } });
      try {
        const providerPayment = await getMercadoPagoPayment(payment.providerPaymentId);
        await updatePaymentFromMercadoPago(providerPayment, { internalPaymentId: payment.id, providerPaymentId: payment.providerPaymentId });
        reconciledPayments += 1;
      } catch {
        pendingPaymentRetries += 1;
      }
    }

    if (pendingPaymentRetries) console.warn('payment_reconciliation_pending', { count: pendingPaymentRetries });
    const recordingCleanup = await purgeExpiredRecordings();

    await prisma.rateLimitEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } } });
    await prisma.idempotencyRecord.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await prisma.authCode.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
    await prisma.$executeRaw`DELETE FROM "Session" WHERE "expiresAt" < NOW() - INTERVAL '24 hours'`;
    return ok({ reconciledCalls, callsNeedingReview, reconciledPayments, pendingPaymentRetries, ...recordingCleanup });
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2034') {
      return handleError(new AppError(409, 'RECONCILIATION_RETRY', 'Conflito transitório; a próxima execução tentará novamente.'));
    }
    return handleError(cause);
  }
}
