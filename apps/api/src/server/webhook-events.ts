import { Prisma, WebhookProvider, prisma } from '@trotebox/db';
import { sha256 } from './crypto';

export async function registerWebhook(input: {
  provider: WebhookProvider;
  externalEventId: string;
  signatureValid: boolean;
  rawBody: string;
  payload?: Record<string, unknown>;
}) {
  try {
    const data: Prisma.WebhookEventUncheckedCreateInput = {
      provider: input.provider,
      externalEventId: input.externalEventId,
      signatureValid: input.signatureValid,
      payloadHash: sha256(input.rawBody),
      ...(input.payload !== undefined ? { payload: input.payload as Prisma.InputJsonValue } : {})
    };
    const event = await prisma.webhookEvent.create({ data });
    return { duplicate: false, event };
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') {
      const event = await prisma.webhookEvent.findUniqueOrThrow({ where: { provider_externalEventId: { provider: input.provider, externalEventId: input.externalEventId } } });
      return { duplicate: true, event };
    }
    throw cause;
  }
}

export async function markWebhookProcessed(id: string, errorMessage?: string) {
  await prisma.webhookEvent.update({
    where: { id },
    data: errorMessage
      ? { errorMessage }
      : { processedAt: new Date(), errorMessage: null }
  });
}
