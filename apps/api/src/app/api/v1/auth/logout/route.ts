import { clearSessionCookie, revokeSession } from '@/server/auth';
import { ok } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  await revokeSession(request);
  return clearSessionCookie(ok({ ok: true }));
}
