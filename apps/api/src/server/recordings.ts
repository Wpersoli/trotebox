import { prisma } from '@trotebox/db';
import { encrypt } from './crypto';
import { env } from './env';
import { AppError } from './http';

function expirationDate() {
  return new Date(Date.now() + env().RECORDING_RETENTION_DAYS * 24 * 60 * 60 * 1000);
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

  return prisma.recording.upsert({
    where: { callId: call.id },
    create: {
      callId: call.id,
      provider: input.provider,
      status: input.status,
      providerRecordingId: input.providerRecordingId ?? null,
      providerDownloadUrlEncrypted: input.downloadUrl ? encrypt(input.downloadUrl) : null,
      durationSeconds: input.durationSeconds ?? null,
      contentType: input.contentType ?? null,
      expiresAt: expirationDate()
    },
    update: {
      provider: input.provider,
      status: input.status,
      providerRecordingId: input.providerRecordingId ?? null,
      providerDownloadUrlEncrypted: input.downloadUrl ? encrypt(input.downloadUrl) : null,
      durationSeconds: input.durationSeconds ?? null,
      contentType: input.contentType ?? null,
      expiresAt: expirationDate()
    }
  });
}
