import { prisma } from '@trotebox/db';
import { ok, handleError } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: 'ok', service: 'trotebox-api', database: 'ok', time: new Date().toISOString() });
  } catch (cause) { return handleError(cause); }
}
