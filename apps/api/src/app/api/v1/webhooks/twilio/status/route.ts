import { WebhookProvider } from '@trotebox/db';
import { applyCallStatus } from '@/server/calls';
import { AppError, handleError, ok } from '@/server/http';
import { validateTwilioRequest } from '@/server/provider-signatures';
import { mapTwilioStatus } from '@/server/provider-status';
import { markWebhookProcessed, registerWebhook } from '@/server/webhook-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const params = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
    if (!await validateTwilioRequest(request, params)) throw new AppError(401, 'INVALID_SIGNATURE', 'Assinatura Twilio inválida.');
    const callSid = params.CallSid ?? '';
    const status = params.CallStatus ?? '';
    const sequence = params.SequenceNumber ?? params.Timestamp ?? '0';
    if (!callSid) throw new AppError(400, 'MISSING_CALL_SID', 'CallSid ausente.');
    const externalId = `${callSid}:${status}:${sequence}`;
    const rawBody = new URLSearchParams(params).toString();
    const registered = await registerWebhook({ provider: WebhookProvider.TWILIO, externalEventId: externalId, signatureValid: true, rawBody, payload: params });
    if (registered.duplicate && registered.event.processedAt) return ok({ received: true, duplicate: true });
    try {
      const mappedStatus = mapTwilioStatus(status);
      if (mappedStatus) await applyCallStatus({ providerCallId: callSid, status: mappedStatus, providerEventId: externalId, payload: params });
      await markWebhookProcessed(registered.event.id);
      return ok({ received: true });
    } catch (cause) {
      await markWebhookProcessed(registered.event.id, cause instanceof Error ? cause.message : 'unknown');
      throw cause;
    }
  } catch (cause) { return handleError(cause); }
}
