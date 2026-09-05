import { prisma } from '@trotebox/db';
import { env } from '@/server/env';
import { escapeXml } from '@/server/xml';
import { AppError, handleError } from '@/server/http';
import { validateTwilioRequest } from '@/server/provider-signatures';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const form = await request.formData();
    const params = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
    if (!await validateTwilioRequest(request, params)) throw new AppError(401, 'INVALID_SIGNATURE', 'Assinatura Twilio inválida.');

    const { id } = await context.params;
    const callSid = params.CallSid?.trim() || null;
    const call = await prisma.$transaction(async (tx) => {
      let current = await tx.callOrder.findUnique({ where: { id }, include: { script: true } });
      if (!current) throw new AppError(404, 'CALL_NOT_FOUND', 'Chamada não encontrada.');

      if (callSid && !current.providerCallId) {
        const existingProviderCall = await tx.callOrder.findUnique({ where: { providerCallId: callSid } });
        if (existingProviderCall && existingProviderCall.id !== current.id) {
          throw new AppError(409, 'PROVIDER_CALL_CONFLICT', 'Identificador de chamada da operadora já vinculado a outro registro.');
        }

        current = await tx.callOrder.update({
          where: { id: current.id },
          data: { providerCallId: callSid }
        });
        await tx.callEvent.create({
          data: {
            callId: current.id,
            providerEventId: `start:${callSid}`,
            status: current.status
          }
        });
        current = await tx.callOrder.findUnique({ where: { id }, include: { script: true } });
        if (!current) throw new AppError(404, 'CALL_NOT_FOUND', 'Chamada não encontrada.');
      }

      return current;
    }, { isolationLevel: 'Serializable' });

    const recordingNotice = env().RECORDING_ENABLED && call.recordingConsentAt
      ? `<Say language="pt-BR">${escapeXml('Aviso: esta chamada de entretenimento está sendo gravada com autorização informada. Se você não concordar, desligue agora.')}</Say>`
      : '';
    const instruction = call.voiceAssetUrl
      ? `<Play>${escapeXml(call.voiceAssetUrl)}</Play>`
      : `<Say language="${escapeXml(call.script.voiceLocale)}">${escapeXml(call.script.body)}</Say>`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?><Response>${recordingNotice}${instruction}</Response>`;
    return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch (cause) { return handleError(cause); }
}
