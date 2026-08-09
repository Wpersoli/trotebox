import { clearSessionCookie } from '@/server/auth';
import { ok } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return clearSessionCookie(ok({ ok: true }));
}
