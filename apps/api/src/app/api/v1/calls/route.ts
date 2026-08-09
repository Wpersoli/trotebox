import { createCallSchema } from '@trotebox/contracts';
import { prisma } from '@trotebox/db';
import { requireUser } from '@/server/auth';
import { createCall } from '@/server/calls';
import { decrypt } from '@/server/crypto';
import { handleError, jsonBody, ok } from '@/server/http';
import { maskPhone } from '@/server/phone-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const calls = await prisma.callOrder.findMany({
      where: { userId: user.id }, include: { script: { select: { title: true } }, recording: { select: { status: true } } },
      orderBy: { createdAt: 'desc' }, take: 100
    });
    return ok({ calls: calls.map((call) => ({
      id: call.id,
      scriptTitle: call.script.title,
      recipientMasked: maskPhone(decrypt(call.recipientPhoneEncrypted)),
      recipientLabel: call.recipientLabel,
      status: call.status,
      creditCost: call.creditCost,
      createdAt: call.createdAt.toISOString(),
      completedAt: call.completedAt?.toISOString(),
      recordingStatus: call.recording?.status
    })) });
  } catch (cause) { return handleError(cause); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = createCallSchema.parse(await jsonBody(request));
    const call = await createCall(user.id, input, request);
    return ok({ call: { id: call.id, status: call.status, creditCost: call.creditCost, createdAt: call.createdAt.toISOString() } }, 201);
  } catch (cause) { return handleError(cause); }
}
