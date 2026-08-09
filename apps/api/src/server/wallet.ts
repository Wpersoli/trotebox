import { LedgerType, Prisma, prisma } from '@trotebox/db';
import { AppError } from './http';

type Tx = Prisma.TransactionClient;

async function walletForUser(tx: Tx, userId: string) {
  return tx.walletAccount.upsert({ where: { userId }, update: {}, create: { userId } });
}

export async function reserveCredits(tx: Tx, userId: string, amount: number, callId: string) {
  const wallet = await walletForUser(tx, userId);
  const updated = await tx.walletAccount.updateMany({
    where: { id: wallet.id, balanceCredits: { gte: amount } },
    data: { balanceCredits: { decrement: amount }, reservedCredits: { increment: amount }, version: { increment: 1 } }
  });
  if (updated.count !== 1) throw new AppError(402, 'INSUFFICIENT_CREDITS', 'Créditos insuficientes.');
  const current = await tx.walletAccount.findUniqueOrThrow({ where: { id: wallet.id } });
  await tx.ledgerEntry.create({ data: {
    walletId: wallet.id, type: LedgerType.CALL_RESERVE, amountCredits: -amount,
    balanceAfter: current.balanceCredits, reservedAfter: current.reservedCredits,
    referenceType: 'CALL', referenceId: callId, description: 'Reserva para chamada'
  }});
  return current;
}

export async function releaseCreditsInTransaction(tx: Tx, userId: string, amount: number, callId: string, reason: string) {
  const existing = await tx.ledgerEntry.findUnique({ where: { type_referenceType_referenceId: { type: LedgerType.CALL_RELEASE, referenceType: 'CALL', referenceId: callId } } });
  if (existing) return existing;
  const reservation = await tx.ledgerEntry.findUnique({ where: { type_referenceType_referenceId: { type: LedgerType.CALL_RESERVE, referenceType: 'CALL', referenceId: callId } } });
  if (!reservation || reservation.amountCredits !== -amount) throw new AppError(409, 'INVALID_RESERVATION', 'Reserva da chamada não encontrada ou divergente.');
  const captured = await tx.ledgerEntry.findUnique({ where: { type_referenceType_referenceId: { type: LedgerType.CALL_CAPTURE, referenceType: 'CALL', referenceId: callId } } });
  if (captured) throw new AppError(409, 'CALL_ALREADY_CAPTURED', 'A chamada já foi liquidada.');
  const wallet = await walletForUser(tx, userId);
  if (wallet.reservedCredits < amount) throw new AppError(409, 'INVALID_RESERVATION', 'Reserva inconsistente.');
  const current = await tx.walletAccount.update({ where: { id: wallet.id }, data: { balanceCredits: { increment: amount }, reservedCredits: { decrement: amount }, version: { increment: 1 } } });
  return tx.ledgerEntry.create({ data: {
    walletId: wallet.id, type: LedgerType.CALL_RELEASE, amountCredits: amount,
    balanceAfter: current.balanceCredits, reservedAfter: current.reservedCredits,
    referenceType: 'CALL', referenceId: callId, description: reason
  }});
}

export async function releaseCredits(userId: string, amount: number, callId: string, reason: string) {
  return prisma.$transaction(
    (tx) => releaseCreditsInTransaction(tx, userId, amount, callId, reason),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function captureCreditsInTransaction(tx: Tx, userId: string, amount: number, callId: string) {
  const existing = await tx.ledgerEntry.findUnique({ where: { type_referenceType_referenceId: { type: LedgerType.CALL_CAPTURE, referenceType: 'CALL', referenceId: callId } } });
  if (existing) return existing;
  const reservation = await tx.ledgerEntry.findUnique({ where: { type_referenceType_referenceId: { type: LedgerType.CALL_RESERVE, referenceType: 'CALL', referenceId: callId } } });
  if (!reservation || reservation.amountCredits !== -amount) throw new AppError(409, 'INVALID_RESERVATION', 'Reserva da chamada não encontrada ou divergente.');
  const released = await tx.ledgerEntry.findUnique({ where: { type_referenceType_referenceId: { type: LedgerType.CALL_RELEASE, referenceType: 'CALL', referenceId: callId } } });
  if (released) throw new AppError(409, 'CALL_ALREADY_RELEASED', 'A reserva da chamada já foi liberada.');
  const wallet = await walletForUser(tx, userId);
  if (wallet.reservedCredits < amount) throw new AppError(409, 'INVALID_RESERVATION', 'Reserva inconsistente.');
  const current = await tx.walletAccount.update({ where: { id: wallet.id }, data: { reservedCredits: { decrement: amount }, version: { increment: 1 } } });
  return tx.ledgerEntry.create({ data: {
    walletId: wallet.id, type: LedgerType.CALL_CAPTURE, amountCredits: 0,
    balanceAfter: current.balanceCredits, reservedAfter: current.reservedCredits,
    referenceType: 'CALL', referenceId: callId, description: 'Chamada concluída'
  }});
}

export async function captureCredits(userId: string, amount: number, callId: string) {
  return prisma.$transaction(
    (tx) => captureCreditsInTransaction(tx, userId, amount, callId),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function creditPurchase(input: { userId: string; credits: number; paymentId: string; description: string }) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.ledgerEntry.findUnique({ where: { type_referenceType_referenceId: { type: LedgerType.PURCHASE, referenceType: 'PAYMENT', referenceId: input.paymentId } } });
    if (existing) return existing;
    const wallet = await walletForUser(tx, input.userId);
    const current = await tx.walletAccount.update({ where: { id: wallet.id }, data: { balanceCredits: { increment: input.credits }, version: { increment: 1 } } });
    return tx.ledgerEntry.create({ data: {
      walletId: wallet.id, type: LedgerType.PURCHASE, amountCredits: input.credits,
      balanceAfter: current.balanceCredits, reservedAfter: current.reservedCredits,
      referenceType: 'PAYMENT', referenceId: input.paymentId, description: input.description
    }});
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
