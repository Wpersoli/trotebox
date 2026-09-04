import { prisma } from '@trotebox/db';
import { requireUser } from '@/server/auth';
import { decrypt } from '@/server/crypto';
import { AppError, handleError, ok } from '@/server/http';
import { maskPhone } from '@/server/phone-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const call = await prisma.callOrder.findFirst({ where: { id, userId: user.id }, include: { script: true, recording: { select: { status: true, durationSeconds: true, expiresAt: true } }, events: { orderBy: { createdAt: 'asc' } } } });
    if (!call) throw new AppError(404, 'CALL_NOT_FOUND', 'Chamada não encontrada.');
    return ok({ call: {
      id: call.id, status: call.status, recipientMasked: maskPhone(decrypt(call.recipientPhoneEncrypted)),
      script: { id: call.script.id, title: call.script.title }, creditCost: call.creditCost,
      createdAt: call.createdAt.toISOString(), completedAt: call.completedAt?.toISOString(),
      recording: call.recording ? {
        status: call.recording.status,
        durationSeconds: call.recording.durationSeconds,
        expiresAt: call.recording.expiresAt?.toISOString(),
        playbackUrl: `/api/v1/calls/${call.id}/recording`
      } : null,
      events: call.events.map((event) => ({ status: event.status, createdAt: event.createdAt.toISOString() }))
    }});
  } catch (cause) { return handleError(cause); }
}
