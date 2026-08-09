import { stripeCheckoutSchema } from '@trotebox/contracts';
import { requireUser } from '@/server/auth';
import { handleError, jsonBody, ok } from '@/server/http';
import { createStripeCheckout } from '@/server/payments/stripe';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = stripeCheckoutSchema.parse(await jsonBody(request));
    const result = await createStripeCheckout(user.id, input.packCode, input.idempotencyKey);
    await audit({ request, userId: user.id, action: 'STRIPE_CHECKOUT_CREATED', targetType: 'PAYMENT', targetId: result.payment.id });
    return ok({ checkoutUrl: result.checkoutUrl });
  } catch (cause) { return handleError(cause); }
}
