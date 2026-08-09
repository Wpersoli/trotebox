import { requireUser } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return ok({ user: { id: user.id, email: user.email, displayName: user.displayName } });
  } catch (cause) {
    return handleError(cause);
  }
}
