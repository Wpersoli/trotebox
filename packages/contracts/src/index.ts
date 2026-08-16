import { z } from 'zod';

export const e164Schema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'Use telefone no formato E.164, por exemplo +5511999999999.');


export const requestAuthCodeSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase())
});

export const verifyAuthCodeSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  code: z.string().trim().regex(/^\d{6}$/, 'Use o código de seis dígitos.')
});

export const devLoginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  displayName: z.string().trim().min(2).max(80)
});

export const createCallSchema = z.object({
  scriptId: z.string().cuid(),
  recipientPhone: e164Schema,
  recipientLabel: z.string().trim().min(2).max(80).optional(),
  consentConfirmed: z.literal(true),
  recordingConsentConfirmed: z.boolean().default(false),
  idempotencyKey: z.string().uuid()
});

export const stripeCheckoutSchema = z.object({
  packCode: z.string().trim().min(2).max(40),
  idempotencyKey: z.string().uuid()
});

export const mercadoPagoPixSchema = z.object({
  packCode: z.string().trim().min(2).max(40),
  idempotencyKey: z.string().uuid()
});

export const callStatusSchema = z.enum([
  'VALIDATING',
  'CREDIT_RESERVED',
  'QUEUED',
  'DIALING',
  'RINGING',
  'ANSWERED',
  'RECORDING_PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELED',
  'REFUNDED',
  'EXPIRED'
]);

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional()
  })
});

export type RequestAuthCodeInput = z.infer<typeof requestAuthCodeSchema>;
export type VerifyAuthCodeInput = z.infer<typeof verifyAuthCodeSchema>;
export type CreateCallInput = z.infer<typeof createCallSchema>;
export type StripeCheckoutInput = z.infer<typeof stripeCheckoutSchema>;
export type MercadoPagoPixInput = z.infer<typeof mercadoPagoPixSchema>;
export type CallStatus = z.infer<typeof callStatusSchema>;

export type ScriptSummary = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  creditCost: number;
  durationSeconds: number;
  accent: string;
};

export type CreditPackSummary = {
  code: string;
  name: string;
  credits: number;
  priceCents: number;
  currency: 'BRL';
  highlight?: boolean;
};

export type WalletSummary = {
  balanceCredits: number;
  reservedCredits: number;
  recentEntries: Array<{
    id: string;
    type: string;
    amountCredits: number;
    description: string;
    createdAt: string;
  }>;
};
