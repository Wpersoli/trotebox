import { prisma } from '@trotebox/db';
import { requireUser } from '@/server/auth';
import { decrypt } from '@/server/crypto';
import { AppError, handleError } from '@/server/http';
import { env } from '@/server/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TWILIO_HOSTS = new Set(['api.twilio.com', 'api.eu1.twilio.com', 'api.ie1.twilio.com']);

function twilioRecordingUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !TWILIO_HOSTS.has(parsed.hostname)) {
    throw new AppError(502, 'INVALID_RECORDING_URL', 'Origem da gravação não permitida.');
  }
  if (!parsed.pathname.endsWith('.mp3')) parsed.pathname += '.mp3';
  return parsed;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const recording = await prisma.recording.findFirst({
      where: { callId: id, call: { userId: user.id } },
      include: { call: { select: { id: true, telephonyProvider: true } } }
    });

    if (!recording) throw new AppError(404, 'RECORDING_NOT_FOUND', 'Gravação não encontrada.');
    if (recording.deletedAt || (recording.expiresAt && recording.expiresAt <= new Date())) {
      throw new AppError(410, 'RECORDING_EXPIRED', 'Esta gravação não está mais disponível.');
    }
    // Only completed provider recordings may be streamed. PROCESSING must wait for
    // the media pipeline to promote the record to AVAILABLE_AT_PROVIDER.
    if (recording.status !== 'AVAILABLE_AT_PROVIDER') {
      throw new AppError(409, 'RECORDING_NOT_AVAILABLE', 'A gravação ainda não está disponível.');
    }
    if (!recording.providerDownloadUrlEncrypted) throw new AppError(404, 'RECORDING_SOURCE_MISSING', 'Origem da gravação indisponível.');

    if (recording.provider !== 'twilio') {
      throw new AppError(501, 'RECORDING_PROVIDER_UNSUPPORTED', 'Reprodução deste provedor ainda não está disponível.');
    }

    const config = env();
    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
      throw new AppError(503, 'TELEPHONY_NOT_CONFIGURED', 'Credenciais Twilio não configuradas.');
    }

    const source = twilioRecordingUrl(decrypt(recording.providerDownloadUrlEncrypted));
    const authorization = Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString('base64');
    const upstream = await fetch(source, {
      headers: { Authorization: `Basic ${authorization}` },
      cache: 'no-store',
      redirect: 'error'
    });

    if (!upstream.ok || !upstream.body) {
      throw new AppError(502, 'RECORDING_PROVIDER_ERROR', 'Não foi possível obter a gravação do provedor.');
    }

    const headers = new Headers();
    headers.set('Content-Type', recording.contentType || upstream.headers.get('content-type') || 'audio/mpeg');
    headers.set('Cache-Control', 'private, no-store, max-age=0');
    headers.set('X-Content-Type-Options', 'nosniff');
    const length = upstream.headers.get('content-length');
    if (length) headers.set('Content-Length', length);

    return new Response(upstream.body, { status: 200, headers });
  } catch (cause) {
    return handleError(cause);
  }
}
