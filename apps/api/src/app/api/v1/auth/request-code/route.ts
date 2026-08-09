import { requestAuthCodeSchema } from '@trotebox/contracts';
import { requestAuthCode } from '@/server/auth-code';
import { audit } from '@/server/audit';
import { handleError, jsonBody, ok } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const input = requestAuthCodeSchema.parse(await jsonBody(request));
    const result = await requestAuthCode(input, request);
    await audit({ request, actorType: 'ANONYMOUS', action: 'AUTH_CODE_REQUESTED', targetType: 'EMAIL' });
    return ok(result, 202);
  } catch (cause) {
    return handleError(cause);
  }
}
