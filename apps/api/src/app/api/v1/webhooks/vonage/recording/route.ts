import { WebhookProvider, prisma } from '@trotebox/db';
import { sha256 } from '@/server/crypto';
import { AppError, handleError, ok } from '@/server/http';
import { validateVonageRequest } from '@/server/provider-signatures';
import { saveProviderRecording } from '@/server/recordings';
import { markWebhookProcessed, registerWebhook } from '@/server/webhook-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    if (!await validateVonageRequest(request, rawBody)) throw new AppError(401, 'INVALID_SIGNATURE', 'Assinatura Vonage inválida.');
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const recordingId = typeof body.recording_uuid === 'string' ? body.recording_uuid : '';
    const conversationId = typeof body.conversation_uuid === 'string' ? body.conversation_uuid : '';
    const downloadUrl = typeof body.recording_url === 'string' ? body.recording_url : undefined;
    if (!recordingId || !conversationId) throw new AppError(400, 'MISSING_RECORDING_ID', 'Identificador de gravação Vonage ausente.');

    const externalId = `${recordingId}:${String(body.timestamp ?? sha256(rawBody))}`;
    const registered = await registerWebhook({ provider: WebhookProvider.VONAGE, externalEventId: externalId, signatureValid: true, rawBody, payload: body });
    if (registered.duplicate && registered.event.processedAt) return ok({ received: true, duplicate: true });

    try {
      const call = await prisma.callOrder.findUnique({ where: { providerConversationId: conversationId } });
      if (!call) throw new AppError(404, 'CALL_NOT_FOUND', 'Conversa Vonage não associada a uma chamada.');
      await saveProviderRecording({
        callId: call.id,
        provider: 'vonage',
        providerRecordingId: recordingId,
        ...(downloadUrl !== undefined ? { downloadUrl } : {}),
        contentType: 'audio/mpeg',
        status: 'AVAILABLE_AT_PROVIDER'
      });
      await markWebhookProcessed(registered.event.id);
      return ok({ received: true });
    } catch (cause) {
      await markWebhookProcessed(registered.event.id, cause instanceof Error ? cause.message : 'unknown');
      throw cause;
    }
  } catch (cause) { return handleError(cause); }
}
