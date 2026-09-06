import { WebhookProvider } from '@trotebox/db';
import { applyCallStatus } from '@/server/calls';
import { sha256 } from '@/server/crypto';
import { AppError, handleError, ok, webhookBody } from '@/server/http';
import { validateVonageRequest } from '@/server/provider-signatures';
import { mapVonageStatus } from '@/server/provider-status';
import { markWebhookProcessed, registerWebhook } from '@/server/webhook-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const rawBody = await webhookBody(request);
    if (!await validateVonageRequest(request, rawBody)) throw new AppError(401, 'INVALID_SIGNATURE', 'Assinatura Vonage inválida.');
    const body = JSON.parse(rawBody) as Record<string, any>;
    const uuid = String(body.uuid ?? '');
    const status = String(body.status ?? '');
    if (!uuid) throw new AppError(400, 'MISSING_CALL_ID', 'UUID Vonage ausente.');
    const externalId = `${uuid}:${status}:${String(body.timestamp ?? body.sequence ?? sha256(rawBody))}`;
    const registered = await registerWebhook({ provider: WebhookProvider.VONAGE, externalEventId: externalId, signatureValid: true, rawBody });
    if (registered.duplicate && registered.event.processedAt) return ok({ received: true, duplicate: true });
    try {
      const mappedStatus = mapVonageStatus(status);
      const providerConversationId = typeof body.conversation_uuid === 'string' ? body.conversation_uuid : undefined;
      if (mappedStatus) await applyCallStatus({
        providerCallId: uuid,
        ...(providerConversationId !== undefined ? { providerConversationId } : {}),
        status: mappedStatus,
        providerEventId: externalId,
        payload: { uuid, status, ...(providerConversationId ? { conversation_uuid: providerConversationId } : {}), ...(body.timestamp !== undefined ? { timestamp: body.timestamp } : {}), ...(body.sequence !== undefined ? { sequence: body.sequence } : {}) }
      });
      await markWebhookProcessed(registered.event.id);
      return ok({ received: true });
    } catch (cause) {
      await markWebhookProcessed(registered.event.id, cause instanceof Error ? cause.message : 'unknown');
      throw cause;
    }
  } catch (cause) { return handleError(cause); }
}
