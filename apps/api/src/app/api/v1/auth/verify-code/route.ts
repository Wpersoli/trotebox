import { verifyAuthCodeSchema } from '@trotebox/contracts';
import { verifyAuthCode } from '@/server/auth-code';
import { issueToken, setSessionCookie, tokenForNativeClient } from '@/server/auth';
import { audit } from '@/server/audit';
import { handleError, jsonBody, ok } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const input = verifyAuthCodeSchema.parse(await jsonBody(request));
    const user = await verifyAuthCode(input, request);
    await audit({ request, userId: user.id, action: 'PASSWORDLESS_LOGIN', targetType: 'USER', targetId: user.id });
    const token = await issueToken(user);
    const response = ok({
      token: tokenForNativeClient(request, token),
      user: { id: user.id, email: user.email, displayName: user.displayName }
    });
    return setSessionCookie(response, token);
  } catch (cause) {
    return handleError(cause);
  }
}
