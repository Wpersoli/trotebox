import { createHmac } from 'node:crypto';
import { PaymentProvider, PaymentStatus, prisma } from '@trotebox/db';
import { env } from '../env';
import { safeEqualHex } from '../crypto';
import { AppError } from '../http';

function accessToken() {
  const token = env().MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new AppError(503, 'MERCADOPAGO_NOT_CONFIGURED', 'Mercado Pago não configurado.');
  return token;
}

export async function createPix(userId: string, packCode: string, payerEmail: string, payerDocument: string | undefined, idempotencyKey: string) {
  const existing = await prisma.payment.findUnique({ where: { idempotencyKey }, include: { creditPack: true } });
  if (existing && (existing.userId !== userId || existing.creditPack.code !== packCode || existing.provider !== PaymentProvider.MERCADOPAGO)) throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Chave idempotente já usada em outra operação.');
  if (existing?.providerPaymentId) {
    const payment = await getMercadoPagoPayment(existing.providerPaymentId);
    return pixResponse(payment, existing.id);
  }

  const pack = await prisma.creditPack.findFirst({ where: { code: packCode, active: true } });
  if (!pack) throw new AppError(404, 'PACK_NOT_FOUND', 'Pacote de créditos não encontrado.');
  const payment = existing ?? await prisma.payment.create({ data: {
    userId, creditPackId: pack.id, provider: PaymentProvider.MERCADOPAGO, status: PaymentStatus.PENDING,
    amountCents: pack.priceCents, currency: pack.currency, credits: pack.credits, idempotencyKey
  }});

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({
      transaction_amount: pack.priceCents / 100,
      description: `${pack.name} — ${pack.credits} créditos`,
      payment_method_id: 'pix',
      external_reference: payment.id,
      notification_url: `${env().PUBLIC_API_URL.replace(/\/$/, '')}/api/v1/webhooks/mercadopago`,
      payer: {
        email: payerEmail,
        ...(payerDocument ? { identification: { type: payerDocument.length === 11 ? 'CPF' : 'CNPJ', number: payerDocument } } : {})
      }
    })
  });
  const payload = await response.json() as Record<string, any>;
  if (!response.ok) throw new AppError(502, 'MERCADOPAGO_CREATE_FAILED', 'Mercado Pago recusou a criação do Pix.', payload);

  await prisma.payment.update({ where: { id: payment.id }, data: { providerPaymentId: String(payload.id), rawStatus: String(payload.status ?? '') } });
  return pixResponse(payload, payment.id);
}

function pixResponse(payload: Record<string, any>, internalPaymentId: string) {
  const tx = payload.point_of_interaction?.transaction_data ?? {};
  return {
    internalPaymentId,
    paymentId: String(payload.id),
    qrCode: String(tx.qr_code ?? ''),
    qrCodeBase64: tx.qr_code_base64 ? String(tx.qr_code_base64) : undefined,
    expiresAt: payload.date_of_expiration ? String(payload.date_of_expiration) : undefined
  };
}

export async function getMercadoPagoPayment(id: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken()}` }
  });
  const payload = await response.json() as Record<string, any>;
  if (!response.ok) throw new AppError(502, 'MERCADOPAGO_FETCH_FAILED', 'Não foi possível consultar o pagamento.', payload);
  return payload;
}

export function validateMercadoPagoSignature(input: { xSignature: string; xRequestId: string; dataId: string }) {
  const secret = env().MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) throw new AppError(503, 'MERCADOPAGO_WEBHOOK_NOT_CONFIGURED', 'Webhook Mercado Pago não configurado.');
  let timestamp = '';
  let received = '';
  for (const part of input.xSignature.split(',')) {
    const [key, value] = part.split('=', 2).map((item) => item.trim());
    if (key === 'ts') timestamp = value ?? '';
    if (key === 'v1') received = value ?? '';
  }
  if (!timestamp || !received) return false;
  const parts: string[] = [];
  if (input.dataId) parts.push(`id:${input.dataId.toLowerCase()}`);
  if (input.xRequestId) parts.push(`request-id:${input.xRequestId}`);
  parts.push(`ts:${timestamp}`);
  const computed = createHmac('sha256', secret).update(`${parts.join(';')};`).digest('hex');
  return safeEqualHex(computed, received);
}
