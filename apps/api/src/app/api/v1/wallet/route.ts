import { prisma } from '@trotebox/db';
import { requireUser } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const wallet = await prisma.walletAccount.upsert({
      where: { userId: user.id }, update: {}, create: { userId: user.id },
      include: { entries: { orderBy: { createdAt: 'desc' }, take: 20 } }
    });
    return ok({
      balanceCredits: wallet.balanceCredits,
      reservedCredits: wallet.reservedCredits,
      recentEntries: wallet.entries.map((entry) => ({
        id: entry.id, type: entry.type, amountCredits: entry.amountCredits,
        description: entry.description, createdAt: entry.createdAt.toISOString()
      }))
    });
  } catch (cause) { return handleError(cause); }
}
