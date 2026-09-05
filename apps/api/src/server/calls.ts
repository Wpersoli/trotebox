import { CallStatus, Prisma, prisma } from '@trotebox/db';
import type { CreateCallInput } from '@trotebox/contracts';
import { env } from './env';
import { encrypt, hashSubject } from './crypto';
import { AppError } from './http';
import { validateRecipient } from './phone-policy';
import { enforceRateLimits } from './rate-limit';
import { reserveCredits, releaseCredits, releaseCreditsInTransaction, captureCreditsInTransaction } from './wallet';
import { telephonyProvider } from './telephony';
import { audit } from './audit';
import { platformCapabilities } from './capabilities';
import { prepareVoiceAsset } from './voice';

const IDEMPOTENCY_RETRY_DELAYS_MS = [25, 50, 100] as const;
const PROVIDER_PERSIST_RETRY_DELAYS_MS = [25, 75, 150] as const;

function isRetryableTransactionError(cause: unknown) {
  return cause instanceof Prisma.PrismaClientKnownRequestError
    && (cause.code === 'P2002' || cause.code === 'P2034');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertIdempotentMatch(existing: { userId: string; scriptId: string; recipientPhoneHash: string }, userId: string, scriptId: string, phoneHash: string) {
  if (existing.userId !== userId || existing.scriptId !== scriptId || existing.recipientPhoneHash !== phoneHash) {
    throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Chave idempotente já usada com dados diferentes.');
  }
}

async function persistProviderStart(callId: string, providerCallId: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < PROVIDER_PERSIST_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const updated = await tx.callOrder.update({
          where: { id: callId },
          data: {
            providerCallId,
            status: CallStatus.DIALING,
            failureCode: null,
            failureMessage: null
          }
        });
        await tx.callEvent.upsert({
          where: {
            callId_providerEventId: {
              callId,
              providerEventId: `start:${providerCallId}`
            }
          },
          create: {
            callId,
            providerEventId: `start:${providerCallId}`,
            status: CallStatus.DIALING
          },
          update: {
            status: CallStatus.DIALING
          }
        });
        return updated;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (cause) {
      lastError = cause;
      if (!isRetryableTransactionError(cause)) throw cause;
      const delayMs = PROVIDER_PERSIST_RETRY_DELAYS_MS[attempt];
      if (delayMs === undefined) break;
      await sleep(delayMs);
    }
  }

  throw new AppError(
    503,
    'CALL_RECONCILIATION_PENDING',
    `A operadora aceitou a chamada (${providerCallId}), mas a confirmação local ainda não pôde ser persistida. O crédito permanece reservado para reconciliação segura.`,
    lastError instanceof Error ? { cause: lastError.message } : undefined
  );
}

export async function createCall(userId: string, input: CreateCallInput, request: Request) {
  const phone = validateRecipient(input.recipientPhone);
  const phoneHash = hashSubject(phone);
  const existing = await prisma.callOrder.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { script: true } });
  if (existing) {
    assertIdempotentMatch(existing, userId, input.scriptId, phoneHash);
    return existing;
  }

  const config = env();
  if (!platformCapabilities(config).outboundCalls) {
    throw new AppError(503, 'TELEPHONY_NOT_CONFIGURED', 'Telefonia temporariamente indisponível. Nenhum crédito foi reservado.');
  }

  await enforceRateLimits([
    {
      bucket: 'call:user:hour',
      subjectHash: hashSubject(userId),
      limit: config.MAX_CALLS_PER_USER_PER_HOUR,
      windowMs: 60 * 60 * 1000
    },
    {
      bucket: 'call:recipient:day',
      subjectHash: phoneHash,
      limit: config.MAX_CALLS_PER_RECIPIENT_PER_DAY,
      windowMs: 24 * 60 * 60 * 1000
    }
  ]);

  const suppression = await prisma.suppression.findUnique({ where: { recipientPhoneHash: phoneHash } });
  if (suppression && (!suppression.expiresAt || suppression.expiresAt > new Date())) {
    throw new AppError(403, 'RECIPIENT_SUPPRESSED', 'Este destinatário não pode ser contatado.');
  }

  const script = await prisma.script.findUnique({ where: { id: input.scriptId } });
  if (!script?.active) throw new AppError(404, 'SCRIPT_NOT_FOUND', 'Experiência indisponível.');

  let call: Awaited<ReturnType<typeof prisma.callOrder.findUnique>> = null;
  let lastTransactionError: unknown;

  for (let attempt = 0; attempt < IDEMPOTENCY_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      call = await prisma.$transaction(async (tx) => {
        const created = await tx.callOrder.create({ data: {
          userId,
          scriptId: script.id,
          status: CallStatus.VALIDATING,
          recipientPhoneEncrypted: encrypt(phone),
          recipientPhoneHash: phoneHash,
          recipientLabel: input.recipientLabel ?? null,
          consentConfirmedAt: new Date(),
          recordingConsentAt: input.recordingConsentConfirmed ? new Date() : null,
          creditCost: script.creditCost,
          reservedCredits: script.creditCost,
          telephonyProvider: config.TELEPHONY_PROVIDER,
          idempotencyKey: input.idempotencyKey
        }});
        await reserveCredits(tx, userId, script.creditCost, created.id);
        await tx.callEvent.create({ data: { callId: created.id, status: CallStatus.CREDIT_RESERVED } });
        return tx.callOrder.update({ where: { id: created.id }, data: { status: CallStatus.CREDIT_RESERVED }, include: { script: true } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      break;
    } catch (cause) {
      lastTransactionError = cause;
      if (!isRetryableTransactionError(cause)) throw cause;
      const delayMs = IDEMPOTENCY_RETRY_DELAYS_MS[attempt];
      if (delayMs === undefined) break;
      await sleep(delayMs);
    }
  }

  if (!call) {
    const winner = await prisma.callOrder.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { script: true } });
    if (!winner) {
      throw lastTransactionError instanceof Error
        ? lastTransactionError
        : new AppError(503, 'CALL_CREATION_RETRY_EXHAUSTED', 'Não foi possível confirmar a criação da chamada.');
    }
    assertIdempotentMatch(winner, userId, input.scriptId, phoneHash);
    call = winner;
  }

  let providerAccepted = false;

  try {
    const voiceAssetUrl = await prepareVoiceAsset(script);
    if (voiceAssetUrl) await prisma.callOrder.update({ where: { id: call.id }, data: { voiceAssetUrl } });
    const base = config.PUBLIC_API_URL.replace(/\/$/, '');
    const provider = await telephonyProvider();
    const started = await provider.startCall({
      callId: call.id,
      to: phone,
      answerUrl: `${base}/api/v1/telephony/${config.TELEPHONY_PROVIDER}/answer/${call.id}`,
      statusUrl: `${base}/api/v1/webhooks/${config.TELEPHONY_PROVIDER}/status`,
      recordingStatusUrl: `${base}/api/v1/webhooks/${config.TELEPHONY_PROVIDER}/recording`,
      recordingAllowed: config.RECORDING_ENABLED && Boolean(input.recordingConsentConfirmed)
    });
    providerAccepted = true;

    const updated = await persistProviderStart(call.id, started.providerCallId);
    await audit({ request, userId, action: 'CALL_CREATED', targetType: 'CALL', targetId: call.id, metadata: { scriptId: script.id, provider: started.provider } });
    if (started.provider === 'mock' && config.MOCK_CALL_AUTO_COMPLETE) {
      const completed = await applyCallStatus({
        providerCallId: started.providerCallId,
        status: CallStatus.COMPLETED,
        providerEventId: `mock:completed:${started.providerCallId}`,
        payload: { simulated: true }
      });
      return { ...completed, script };
    }
    return { ...updated, script };
  } catch (cause) {
    if (!providerAccepted) {
      await prisma.callOrder.update({ where: { id: call.id }, data: { status: CallStatus.FAILED, failureCode: 'PROVIDER_START_FAILED', failureMessage: cause instanceof Error ? cause.message.slice(0, 300) : 'unknown' } });
      await releaseCredits(userId, script.creditCost, call.id, 'Liberação por falha ao iniciar chamada');
    }
    throw cause;
  }
}

const terminalFailure = new Set<CallStatus>([CallStatus.FAILED, CallStatus.CANCELED, CallStatus.EXPIRED]);
const terminalStatus = new Set<CallStatus>([CallStatus.COMPLETED, CallStatus.FAILED, CallStatus.CANCELED, CallStatus.EXPIRED, CallStatus.REFUNDED]);
const progressRank: Partial<Record<CallStatus, number>> = {
  [CallStatus.VALIDATING]: 0,
  [CallStatus.CREDIT_RESERVED]: 1,
  [CallStatus.QUEUED]: 2,
  [CallStatus.DIALING]: 3,
  [CallStatus.RINGING]: 4,
  [CallStatus.ANSWERED]: 5,
  [CallStatus.RECORDING_PROCESSING]: 6,
  [CallStatus.COMPLETED]: 7
};

export async function applyCallStatus(input: { providerCallId: string; providerConversationId?: string; status: CallStatus; providerEventId: string; payload?: Record<string, unknown> }) {
  return prisma.$transaction(async (tx) => {
    let call = await tx.callOrder.findUnique({ where: { providerCallId: input.providerCallId } });
    if (!call) throw new AppError(404, 'CALL_NOT_FOUND', 'Chamada não encontrada.');

    if (input.providerConversationId && call.providerConversationId !== input.providerConversationId) {
      call = await tx.callOrder.update({ where: { id: call.id }, data: { providerConversationId: input.providerConversationId } });
    }

    const event = await tx.callEvent.findFirst({ where: { callId: call.id, providerEventId: input.providerEventId } });
    if (event) return call;

    const eventData: Prisma.CallEventUncheckedCreateInput = {
      callId: call.id,
      providerEventId: input.providerEventId,
      status: input.status,
      ...(input.payload !== undefined ? { payload: input.payload as Prisma.InputJsonValue } : {})
    };
    await tx.callEvent.create({ data: eventData });

    if (terminalStatus.has(call.status)) return call;
    const currentRank = progressRank[call.status];
    const incomingRank = progressRank[input.status];
    if (currentRank !== undefined && incomingRank !== undefined && incomingRank <= currentRank) return call;

    const updateData: Prisma.CallOrderUncheckedUpdateInput = { status: input.status };
    if (input.status === CallStatus.ANSWERED && !call.answeredAt) updateData.answeredAt = new Date();
    if (input.status === CallStatus.COMPLETED) updateData.completedAt = new Date();
    const updated = await tx.callOrder.update({ where: { id: call.id }, data: updateData });

    if (input.status === CallStatus.COMPLETED) await captureCreditsInTransaction(tx, call.userId, call.reservedCredits, call.id);
    if (terminalFailure.has(input.status)) await releaseCreditsInTransaction(tx, call.userId, call.reservedCredits, call.id, `Liberação por status ${input.status}`);
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
