import { devLoginSchema } from '@trotebox/contracts';
import { prisma } from '@trotebox/db';
import { env } from '@/server/env';
import { issueToken, setSessionCookie, tokenForNativeClient } from '@/server/auth';
import { AppError, handleError, jsonBody, ok } from '@/server/http';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!env().ENABLE_DEV_AUTH || env().NODE_ENV === 'production') throw new AppError(404, 'NOT_FOUND', 'Rota indisponível.');
    const input = devLoginSchema.parse(await jsonBody(request));
    const user = await prisma.user.upsert({
      where: { email: input.email },
      update: { displayName: input.displayName },
      create: { email: input.email, displayName: input.displayName }
    });
    await prisma.walletAccount.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, balanceCredits: 30 } });
    await audit({ request, userId: user.id, action: 'DEV_LOGIN', targetType: 'USER', targetId: user.id });
    const token = await issueToken(user);
    const response = ok({ token: tokenForNativeClient(request, token), user: { id: user.id, email: user.email, displayName: user.displayName } });
    return setSessionCookie(response, token);
  } catch (cause) { return handleError(cause); }
}
