import { Vonage } from '@vonage/server-sdk';
import { env } from '../env';
import { AppError } from '../http';
import type { StartCallInput, StartCallResult, TelephonyProvider } from './types';

export class VonageTelephonyProvider implements TelephonyProvider {
  async startCall(input: StartCallInput): Promise<StartCallResult> {
    const config = env();
    if (!config.VONAGE_APPLICATION_ID || !config.VONAGE_PRIVATE_KEY || !config.VONAGE_FROM_NUMBER) {
      throw new AppError(503, 'VONAGE_NOT_CONFIGURED', 'Vonage não configurado.');
    }
    const vonage = new Vonage({
      applicationId: config.VONAGE_APPLICATION_ID,
      privateKey: config.VONAGE_PRIVATE_KEY.replace(/\\n/g, '\n')
    });
    const result = await vonage.voice.createOutboundCall({
      to: [{ type: 'phone', number: input.to.replace(/^\+/, '') }],
      from: { type: 'phone', number: config.VONAGE_FROM_NUMBER.replace(/^\+/, '') },
      answerUrl: [input.answerUrl],
      eventUrl: [input.statusUrl]
    });
    const uuid = 'uuid' in result ? String(result.uuid) : '';
    if (!uuid) throw new AppError(502, 'VONAGE_INVALID_RESPONSE', 'Vonage não retornou identificador da chamada.');
    return { provider: 'vonage', providerCallId: uuid };
  }
}
