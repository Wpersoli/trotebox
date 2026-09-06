import { WebhookProvider, prisma } from '@trotebox/db';
import { AppError, handleError, ok, urlEncodedWebhookBody } from '@/server/http';
import { validateTwilioRequest } from '@/server/provider-signatures';
import { saveProviderRecording } from '@/server/recordings';
import { markWebhookProcessed, registerWebhook } from '@/server/webhook-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { rawBody, params } = await urlEncodedWebhookBody(request);
    if (!await validateTwilioRequest(request, params)) throw new AppError(401, 'INVALID_SIGNATURE', 'Assinatura Twilio inválida.');

    const callSid = params.CallSid ?? '';
    const recordingSid = params.RecordingSid ?? '';
    const recordingStatus = (params.RecordingStatus ?? '').toLowerCase();
    if (!callSid || !recordingSid) throw new AppError(400, 'MISSING_RECORDING_ID', 'Identificador de gravação ausente.');

    const externalId = `${recordingSid}:${recordingStatus || 'unknown'}`;
    const registered = await registerWebhook({ provider: WebhookProvider.TWILIO, externalEventId: externalId, signatureValid: true, rawBody });
    if (registered.duplicate && registered.event.processedAt) return ok({ received: true, duplicate: true });

    try {
      const call = await prisma.callOrder.findUnique({ where: { providerCallId: callSid } });
      if (!call) throw new AppError(404, 'CALL_NOT_FOUND', 'Chamada não encontrada.');
      const duration = Number.parseInt(params.RecordingDuration ?? '', 10);
      await saveProviderRecording({
        callId: call.id,
        provider: 'twilio',
        providerRecordingId: recordingSid,
        ...(params.RecordingUrl ? { downloadUrl: params.RecordingUrl } : {}),
        ...(Number.isFinite(duration) ? { durationSeconds: duration } : {}),
        contentType: 'audio/mpeg',
        status: recordingStatus === 'completed' ? 'AVAILABLE_AT_PROVIDER' : recordingStatus === 'absent' ? 'ABSENT' : 'PROCESSING'
      });
      await markWebhookProcessed(registered.event.id);
      return ok({ received: true });
    } catch (cause) {
      await markWebhookProcessed(registered.event.id, cause instanceof Error ? cause.message : 'unknown');
      throw cause;
    }
  } catch (cause) { return handleError(cause); }
}
