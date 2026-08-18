import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export {
  CallStatus,
  LedgerType,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  PrismaClient,
  WebhookProvider
} from '@prisma/client';
export type { Script } from '@prisma/client';
