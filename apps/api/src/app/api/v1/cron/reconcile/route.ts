import { CallStatus, Prisma, prisma } from '@trotebox/db';
import { env } from '@/server/env';
import { AppError, handleError, ok } from '@/server/http';
import { releaseCreditsInTransaction } from '@/server/wallet';

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

    await prisma.rateLimitEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } } });
    await prisma.idempotencyRecord.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await prisma.authCode.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
    return ok({ reconciledCalls });
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2034') {
      return handleError(new AppError(409, 'RECONCILIATION_RETRY', 'Conflito transitório; a próxima execução tentará novamente.'));
    }
    return handleError(cause);
  }
}
