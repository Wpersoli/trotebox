import Stripe from 'stripe';
import { PaymentProvider, PaymentStatus, prisma } from '@trotebox/db';
import { env } from '../env';
import { AppError } from '../http';

function stripeClient() {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Stripe não configurado.');
  return new Stripe(key);
}

export async function createStripeCheckout(userId: string, packCode: string, idempotencyKey: string) {
  const existing = await prisma.payment.findUnique({ where: { idempotencyKey }, include: { creditPack: true } });
  if (existing && (existing.userId !== userId || existing.creditPack.code !== packCode || existing.provider !== PaymentProvider.STRIPE)) throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Chave idempotente já usada em outra operação.');
  if (existing?.providerCheckoutId) {
    const session = await stripeClient().checkout.sessions.retrieve(existing.providerCheckoutId);
    if (session.url) return { checkoutUrl: session.url, payment: existing };
  }

  const pack = await prisma.creditPack.findFirst({ where: { code: packCode, active: true } });
  if (!pack) throw new AppError(404, 'PACK_NOT_FOUND', 'Pacote de créditos não encontrado.');
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const payment = existing ?? await prisma.payment.create({ data: {
    userId, creditPackId: pack.id, provider: PaymentProvider.STRIPE, status: PaymentStatus.PENDING,
    amountCents: pack.priceCents, currency: pack.currency, credits: pack.credits, idempotencyKey
  }});

  const metadata = { paymentId: payment.id, userId, packCode: pack.code };
  const configuredPrice = pack.stripePriceId || process.env[`STRIPE_PRICE_PACK_${pack.code.toUpperCase()}`];
  const session = await stripeClient().checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    success_url: `${env().PUBLIC_WEB_URL.replace(/\/$/, '')}/wallet/?payment=success`,
    cancel_url: `${env().PUBLIC_WEB_URL.replace(/\/$/, '')}/wallet/?payment=canceled`,
    metadata,
    payment_intent_data: { metadata },
    line_items: configuredPrice
      ? [{ price: configuredPrice, quantity: 1 }]
      : [{ price_data: { currency: pack.currency.toLowerCase(), unit_amount: pack.priceCents, product_data: { name: `${pack.name} — ${pack.credits} créditos` } }, quantity: 1 }]
  }, { idempotencyKey });

  await prisma.payment.update({ where: { id: payment.id }, data: { providerCheckoutId: session.id } });
  if (!session.url) throw new AppError(502, 'STRIPE_NO_URL', 'Stripe não retornou URL de pagamento.');
  return { checkoutUrl: session.url, payment };
}

export function constructStripeEvent(rawBody: string, signature: string) {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new AppError(503, 'STRIPE_WEBHOOK_NOT_CONFIGURED', 'Webhook Stripe não configurado.');
  return stripeClient().webhooks.constructEvent(rawBody, signature, secret);
}

export function retrieveStripeCharge(id: string) {
  return stripeClient().charges.retrieve(id);
}
