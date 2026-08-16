import { PaymentProvider, prisma } from '@trotebox/db';
import { requireUser } from '@/server/auth';
import { getMercadoPagoPayment } from '@/server/payments/mercadopago';
import { updatePaymentFromMercadoPago } from '@/server/payment-events';
import { AppError, handleError, ok } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  try {
    const user = await requireUser(request);
    const { paymentId } = await context.params;
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, userId: user.id, provider: PaymentProvider.MERCADOPAGO }
    });
    if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Pagamento não encontrado.');
    if (!payment.providerPaymentId) return ok({ status: payment.status, reconciled: false });

    const providerPayment = await getMercadoPagoPayment(payment.providerPaymentId);
    await updatePaymentFromMercadoPago(providerPayment, { internalPaymentId: payment.id, providerPaymentId: payment.providerPaymentId });
    const refreshed = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    return ok({ status: refreshed.status, reconciled: true, approvedAt: refreshed.approvedAt });
  } catch (cause) {
    return handleError(cause);
  }
}
