import { WebhookProvider } from '@trotebox/db';
import { getMercadoPagoPayment, mercadoPagoSignedDataId, validateMercadoPagoSignature } from '@/server/payments/mercadopago';
import { updatePaymentFromMercadoPago } from '@/server/payment-events';
import { AppError, handleError, ok, webhookBody } from '@/server/http';
import { markWebhookProcessed, registerWebhook } from '@/server/webhook-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const rawBody = await webhookBody(request);
    const body = JSON.parse(rawBody) as Record<string, any>;
    const url = new URL(request.url);
    const signedDataId = mercadoPagoSignedDataId(url);
    const bodyDataId = String(body.data?.id ?? '').trim();
    if (signedDataId && bodyDataId && signedDataId.toLowerCase() !== bodyDataId.toLowerCase()) {
      throw new AppError(400, 'WEBHOOK_RESOURCE_ID_MISMATCH', 'Identificador do recurso diverge entre URL e corpo do webhook.');
    }
    const xSignature = request.headers.get('x-signature') ?? '';
    const xRequestId = request.headers.get('x-request-id') ?? '';
    if (!validateMercadoPagoSignature({ xSignature, xRequestId, dataId: signedDataId })) throw new AppError(401, 'INVALID_SIGNATURE', 'Assinatura Mercado Pago inválida.');

    const eventType = String(body.type ?? 'payment');
    if (eventType === 'payment' && !signedDataId) {
      throw new AppError(400, 'MISSING_SIGNED_PAYMENT_ID', 'Webhook de pagamento sem identificador assinado na URL.');
    }
    const dataId = signedDataId || bodyDataId;
    const externalId = `${eventType}:${dataId}:${String(body.action ?? '')}:${String(body.id ?? '')}`;
    const registered = await registerWebhook({ provider: WebhookProvider.MERCADOPAGO, externalEventId: externalId, signatureValid: true, rawBody });
    if (registered.duplicate && registered.event.processedAt) return ok({ received: true, duplicate: true });

    try {
      if (eventType === 'payment' && dataId) {
        const payment = await getMercadoPagoPayment(dataId);
        await updatePaymentFromMercadoPago(payment);
      }
      await markWebhookProcessed(registered.event.id);
      return ok({ received: true });
    } catch (cause) {
      // Do not set processedAt on failure. Mercado Pago can retry the notification,
      // while the unique externalEventId still makes the handler idempotent.
      await markWebhookProcessed(registered.event.id, cause instanceof Error ? cause.message : 'unknown');
      throw cause;
    }
  } catch (cause) { return handleError(cause); }
}
