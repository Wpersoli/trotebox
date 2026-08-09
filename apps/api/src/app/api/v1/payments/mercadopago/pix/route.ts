import { mercadoPagoPixSchema } from '@trotebox/contracts';
import { requireUser } from '@/server/auth';
import { handleError, jsonBody, ok } from '@/server/http';
import { createPix } from '@/server/payments/mercadopago';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = mercadoPagoPixSchema.parse(await jsonBody(request));
    const result = await createPix(user.id, input.packCode, input.payerEmail, input.payerDocument, input.idempotencyKey);
    await audit({ request, userId: user.id, action: 'PIX_CREATED', targetType: 'PAYMENT', targetId: result.internalPaymentId });
    return ok(result, 201);
  } catch (cause) { return handleError(cause); }
}
