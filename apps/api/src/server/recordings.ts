import { prisma } from '@trotebox/db';
import { encrypt } from './crypto';
import { env } from './env';
import { AppError } from './http';

const PROVIDER_DELETE_TIMEOUT_MS = 10_000;

export function recordingExpiresAt(anchor: Date, retentionDays: number) {
  return new Date(anchor.getTime() + retentionDays * 24 * 60 * 60 * 1000);
}

async function deleteTwilioRecording(providerRecordingId: string) {
  const config = env();
  if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) return false;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.TWILIO_ACCOUNT_SID)}/Recordings/${encodeURIComponent(providerRecordingId)}.json`;
  const authorization = Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString('base64');

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Basic ${authorization}` },
      signal: AbortSignal.timeout(PROVIDER_DELETE_TIMEOUT_MS)
    });

    // 404 is idempotent success: the provider no longer has the asset.
    if (response.ok || response.status === 404) return true;
    console.error('twilio_recording_delete_failed', { status: response.status });
    return false;
  } catch (cause) {
    console.error('twilio_recording_delete_failed', {
      name: cause instanceof Error ? cause.name : 'UnknownError'
    });
    return false;
  }
}

export async function saveProviderRecording(input: {
  callId: string;
  provider: 'twilio' | 'vonage';
  providerRecordingId?: string;
  downloadUrl?: string;
  durationSeconds?: number;
  contentType?: string;
  status: 'PROCESSING' | 'AVAILABLE_AT_PROVIDER' | 'ABSENT';
}) {
  const call = await prisma.callOrder.findUnique({ where: { id: input.callId } });
  if (!call) throw new AppError(404, 'CALL_NOT_FOUND', 'Chamada não encontrada.');
  if (!call.recordingConsentAt) throw new AppError(409, 'RECORDING_NOT_AUTHORIZED', 'A chamada não possui consentimento de gravação.');

  const existing = await prisma.recording.findUnique({ where: { callId: call.id } });
  const expiresAt = recordingExpiresAt(
    call.completedAt ?? call.createdAt,
    env().RECORDING_RETENTION_DAYS
  );
  const expired = expiresAt <= new Date();

  // A callback tardio nunca deve ressuscitar mídia já eliminada. Se o callback
  // revelar pela primeira vez um ID do provedor, reabre apenas a tarefa de
  // exclusão, sem restaurar URL ou conteúdo local.
  if (existing?.deletedAt) {
    if (input.providerRecordingId && !existing.providerRecordingId) {
      return prisma.recording.update({
        where: { id: existing.id },
        data: {
          providerRecordingId: input.providerRecordingId,
          status: 'DELETION_PENDING',
          deletedAt: null,
          expiresAt,
          providerDownloadUrlEncrypted: null,
          storageKey: null,
          sha256: null
        }
      });
    }
    return existing;
  }

  const retainedStatus = expired ? 'DELETION_PENDING' : input.status;
  const retainedDownloadUrl = !expired && input.downloadUrl ? encrypt(input.downloadUrl) : null;

  return prisma.recording.upsert({
    where: { callId: call.id },
    create: {
      callId: call.id,
      provider: input.provider,
      status: retainedStatus,
      providerRecordingId: input.providerRecordingId ?? null,
      providerDownloadUrlEncrypted: retainedDownloadUrl,
      durationSeconds: input.durationSeconds ?? null,
      contentType: input.contentType ?? null,
      expiresAt
    },
    update: {
      provider: input.provider,
      status: retainedStatus,
      providerRecordingId: input.providerRecordingId ?? existing?.providerRecordingId ?? null,
      providerDownloadUrlEncrypted: retainedDownloadUrl,
      durationSeconds: input.durationSeconds ?? null,
      contentType: input.contentType ?? null,
      expiresAt,
      ...(expired ? { storageKey: null, sha256: null } : {})
    }
  });
}

export async function purgeExpiredRecordings(now = new Date(), limit = 20) {
  const expired = await prisma.recording.findMany({
    where: { deletedAt: null, expiresAt: { lte: now } },
    orderBy: { expiresAt: 'asc' },
    take: limit,
    select: {
      id: true,
      provider: true,
      providerRecordingId: true
    }
  });

  let deletedRecordings = 0;
  let pendingRecordingDeletions = 0;

  for (const recording of expired) {
    let providerDeleted = !recording.providerRecordingId;
    if (recording.provider === 'twilio' && recording.providerRecordingId) {
      providerDeleted = await deleteTwilioRecording(recording.providerRecordingId);
    }

    const changed = await prisma.recording.updateMany({
      where: { id: recording.id, deletedAt: null, expiresAt: { lte: now } },
      data: {
        status: providerDeleted ? 'DELETED' : 'DELETION_PENDING',
        providerDownloadUrlEncrypted: null,
        storageKey: null,
        sha256: null,
        ...(providerDeleted ? { deletedAt: now } : {})
      }
    });

    if (changed.count !== 1) continue;
    if (providerDeleted) deletedRecordings += 1;
    else pendingRecordingDeletions += 1;
  }

  return {
    expiredRecordings: expired.length,
    deletedRecordings,
    pendingRecordingDeletions
  };
}
