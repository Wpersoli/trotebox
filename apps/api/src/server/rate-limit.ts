import { Prisma, prisma } from '@trotebox/db';
import { AppError } from './http';

export async function enforceRateLimit(bucket: string, subjectHash: string, limit: number, windowMs: number) {
  const since = new Date(Date.now() - windowMs);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$transaction(async (tx) => {
        const count = await tx.rateLimitEvent.count({ where: { bucket, subjectHash, createdAt: { gte: since } } });
        if (count >= limit) throw new AppError(429, 'RATE_LIMITED', 'Limite de uso atingido. Tente novamente mais tarde.');
        await tx.rateLimitEvent.create({ data: { bucket, subjectHash } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return;
    } catch (cause) {
      if (cause instanceof AppError) throw cause;
      if (!(cause instanceof Prisma.PrismaClientKnownRequestError) || cause.code !== 'P2034' || attempt === 2) throw cause;
    }
  }
}
