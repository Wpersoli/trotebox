import { prisma } from '@trotebox/db';
import { env } from '@/server/env';
import { AppError, handleError, ok } from '@/server/http';
import { validateVonageRequest } from '@/server/provider-signatures';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const rawBody = await request.text();
  try {
    if (!await validateVonageRequest(request, rawBody)) throw new AppError(401, 'INVALID_SIGNATURE', 'Assinatura Vonage inválida.');
    const payload = rawBody ? JSON.parse(rawBody) as Record<string, unknown> : {};
    const { id } = await context.params;
    const call = await prisma.callOrder.findUnique({ where: { id }, include: { script: true } });
    if (!call) throw new AppError(404, 'CALL_NOT_FOUND', 'Chamada não encontrada.');

    const conversationId = typeof payload.conversation_uuid === 'string' ? payload.conversation_uuid : undefined;
    if (conversationId && call.providerConversationId !== conversationId) {
      await prisma.callOrder.update({ where: { id: call.id }, data: { providerConversationId: conversationId } });
    }

    const actions: Array<Record<string, unknown>> = [];
    if (env().RECORDING_ENABLED && call.recordingConsentAt) {
      actions.push({
        action: 'record',
        eventUrl: [`${env().PUBLIC_API_URL.replace(/\/$/, '')}/api/v1/webhooks/vonage/recording`],
        eventMethod: 'POST',
        format: 'mp3',
        beepStart: true
      });
      actions.push({
        action: 'talk',
        text: 'Aviso: esta chamada de entretenimento está sendo gravada com autorização informada. Se você não concordar, desligue agora.',
        language: 'pt-BR',
        style: 0
      });
    }
    actions.push(call.voiceAssetUrl
      ? { action: 'stream', streamUrl: [call.voiceAssetUrl] }
      : { action: 'talk', text: call.script.body, language: call.script.voiceLocale, style: 0 });
    return ok(actions);
  } catch (cause) { return handleError(cause); }
}

export const GET = POST;
