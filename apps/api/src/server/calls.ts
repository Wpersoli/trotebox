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

export async function createCall(userId: string, input: CreateCallInput, request: Request) {
  const phone = validateRecipient(input.recipientPhone);
  const phoneHash = hashSubject(phone);
  const existing = await prisma.callOrder.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { script: true } });
  if (existing && (existing.userId !== userId || existing.scriptId !== input.scriptId || existing.recipientPhoneHash !== phoneHash)) {
    throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Chave idempotente já usada com dados diferentes.');
  }
  if (existing) return existing;

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

  let call;
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
      return tx.callOrder.update({ where: { id: created.id }, data: { status: CallStatus.CREDIT_RESERVED } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (cause) {
    if (!(cause instanceof Prisma.PrismaClientKnownRequestError) || cause.code !== 'P2002') throw cause;
    const raced = await prisma.callOrder.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { script: true } });
    if (!raced) throw cause;
    if (raced.userId !== userId || raced.scriptId !== input.scriptId || raced.recipientPhoneHash !== phoneHash) {
      throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Chave idempotente já usada com dados diferentes.');
    }
    return raced;
  }

  let providerCallId: string | undefined;

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
    providerCallId = started.providerCallId;

    const updated = await prisma.callOrder.update({ where: { id: call.id }, data: { providerCallId, status: CallStatus.DIALING } });
    try {
      await prisma.callEvent.create({ data: { callId: call.id, providerEventId: `start:${providerCallId}`, status: CallStatus.DIALING } });
    } catch (cause) {
      console.error({ callId: call.id, providerCallId, eventPersistenceError: cause });
    }
    try {
      await audit({ request, userId, action: 'CALL_CREATED', targetType: 'CALL', targetId: call.id, metadata: { scriptId: script.id, provider: started.provider } });
    } catch (cause) {
      console.error({ callId: call.id, auditError: cause });
    }

    if (started.provider === 'mock' && config.MOCK_CALL_AUTO_COMPLETE) {
      const completed = await applyCallStatus({
        providerCallId,
        status: CallStatus.COMPLETED,
        providerEventId: `mock:completed:${providerCallId}`,
        payload: { simulated: true }
      });
      return { ...completed, script };
    }
    return { ...updated, script };
  } catch (cause) {
    if (providerCallId) {
      try {
        await prisma.callOrder.update({
          where: { id: call.id },
          data: {
            providerCallId,
            status: CallStatus.DIALING,
            failureCode: 'PROVIDER_STATE_SYNC_PENDING',
            failureMessage: 'A chamada foi iniciada; a sincronização do estado será concluída pelos callbacks do provedor.'
          }
        });
      } catch (syncCause) {
        console.error({ callId: call.id, providerCallId, syncError: syncCause });
      }
      throw new AppError(502, 'PROVIDER_STATE_SYNC_FAILED', 'A chamada foi iniciada, mas a confirmação do estado está pendente. Consulte o histórico em instantes.');
    }

    await prisma.callOrder.update({ where: { id: call.id }, data: { status: CallStatus.FAILED, failureCode: 'PROVIDER_START_FAILED', failureMessage: cause instanceof Error ? cause.message.slice(0, 300) : 'unknown' } });
    await releaseCredits(userId, script.creditCost, call.id, 'Liberação por falha ao iniciar chamada');
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
