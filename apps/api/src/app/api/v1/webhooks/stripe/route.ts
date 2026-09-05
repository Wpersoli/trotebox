import { PaymentProvider, PaymentStatus, WebhookProvider, prisma } from '@trotebox/db';
import type Stripe from 'stripe';
import { constructStripeEvent } from '@/server/payments/stripe';
import { approvePaymentByInternalId, revokePaymentCredits } from '@/server/payment-events';
import { handleError, ok, AppError } from '@/server/http';
import { markWebhookProcessed, registerWebhook } from '@/server/webhook-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    const signature = request.headers.get('stripe-signature');
    if (!signature) throw new AppError(401, 'MISSING_SIGNATURE', 'Assinatura Stripe ausente.');
    event = constructStripeEvent(rawBody, signature);
  } catch (cause) { return handleError(cause); }

  const registered = await registerWebhook({
    provider: WebhookProvider.STRIPE,
    externalEventId: event.id,
    signatureValid: true,
    rawBody,
    payload: { id: event.id, type: event.type, created: event.created, livemode: event.livemode }
  });
  if (registered.duplicate && registered.event.processedAt) return ok({ received: true, duplicate: true });

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId;
      if (!paymentId) throw new AppError(400, 'MISSING_PAYMENT_ID', 'Sessão Stripe sem paymentId.');
      if (event.type === 'checkout.session.async_payment_succeeded' || session.payment_status === 'paid') {
        const providerPaymentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
        if (session.amount_total == null || !session.currency) throw new AppError(409, 'INVALID_SETTLEMENT', 'Sessão Stripe sem valor ou moeda.');
        await approvePaymentByInternalId(paymentId, providerPaymentId, session.payment_status, {
          provider: PaymentProvider.STRIPE,
          amountCents: session.amount_total,
          currency: session.currency
        });
      }
    }

    if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId;
      if (paymentId) await prisma.payment.updateMany({ where: { id: paymentId, status: PaymentStatus.PENDING }, data: { status: PaymentStatus.CANCELED, rawStatus: 'expired' } });
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const providerPaymentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (providerPaymentId && charge.refunded) await revokePaymentCredits(providerPaymentId, 'REFUND');
    }

    if (event.type === 'charge.dispute.created') {
      const dispute = event.data.object as Stripe.Dispute;
      const charge = typeof dispute.charge === 'string' ? await (await import('@/server/payments/stripe')).retrieveStripeCharge(dispute.charge) : dispute.charge;
      const providerPaymentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (providerPaymentId) await revokePaymentCredits(providerPaymentId, 'CHARGEBACK');
    }

    await markWebhookProcessed(registered.event.id);
    return ok({ received: true });
  } catch (cause) {
    await markWebhookProcessed(registered.event.id, cause instanceof Error ? cause.message : 'unknown');
    return handleError(cause);
  }
}
