import { WebhookProvider } from '@trotebox/db';
import { validateMercadoPagoSignature, getMercadoPagoPayment } from '@/server/payments/mercadopago';
import { updatePaymentFromMercadoPago } from '@/server/payment-events';
import { AppError, handleError, ok } from '@/server/http';
import { markWebhookProcessed, registerWebhook } from '@/server/webhook-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const body = JSON.parse(rawBody) as Record<string, any>;
    const url = new URL(request.url);
    const dataId = url.searchParams.get('data.id') ?? String(body.data?.id ?? '');
    const xSignature = request.headers.get('x-signature') ?? '';
    const xRequestId = request.headers.get('x-request-id') ?? '';
    if (!validateMercadoPagoSignature({ xSignature, xRequestId, dataId })) throw new AppError(401, 'INVALID_SIGNATURE', 'Assinatura Mercado Pago inválida.');
    const externalId = `${String(body.type ?? 'payment')}:${dataId}:${String(body.action ?? '')}:${String(body.id ?? '')}`;
    const registered = await registerWebhook({ provider: WebhookProvider.MERCADOPAGO, externalEventId: externalId, signatureValid: true, rawBody });
    if (registered.duplicate && registered.event.processedAt) return ok({ received: true, duplicate: true });

    try {
      if (String(body.type ?? 'payment') === 'payment' && dataId) {
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
