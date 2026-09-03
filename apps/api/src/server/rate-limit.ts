import { Prisma, prisma } from '@trotebox/db';
import { AppError } from './http';

type RateLimitRule = {
  bucket: string;
  subjectHash: string;
  limit: number;
  windowMs: number;
};

export async function enforceRateLimits(rules: RateLimitRule[]) {
  if (!rules.length) return;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const now = Date.now();

      await prisma.$transaction(async (tx) => {
        for (const rule of rules) {
          const since = new Date(now - rule.windowMs);

          const count = await tx.rateLimitEvent.count({
            where: {
              bucket: rule.bucket,
              subjectHash: rule.subjectHash,
              createdAt: { gte: since }
            }
          });

          if (count >= rule.limit) {
            throw new AppError(
              429,
              'RATE_LIMITED',
              'Limite de uso atingido. Tente novamente mais tarde.'
            );
          }
        }

        for (const rule of rules) {
          await tx.rateLimitEvent.create({
            data: {
              bucket: rule.bucket,
              subjectHash: rule.subjectHash
            }
          });
        }
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });

      return;
    } catch (cause) {
      if (cause instanceof AppError) throw cause;

      const retryable =
        cause instanceof Prisma.PrismaClientKnownRequestError &&
        cause.code === 'P2034';

      if (!retryable || attempt === 2) throw cause;
    }
  }
}

export async function enforceRateLimit(
  bucket: string,
  subjectHash: string,
  limit: number,
  windowMs: number
) {
  await enforceRateLimits([
    {
      bucket,
      subjectHash,
      limit,
      windowMs
    }
  ]);
}
