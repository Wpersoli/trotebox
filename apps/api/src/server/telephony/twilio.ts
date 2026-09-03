import twilio from 'twilio';
import { env } from '../env';
import { AppError } from '../http';
import type { StartCallInput, StartCallResult, TelephonyProvider } from './types';

const TWILIO_TRIAL_TTS_URL =
  'https://webhooks.twilio.com/v1/Voice/Template/voice_text_to_speech';

export class TwilioTelephonyProvider implements TelephonyProvider {
  async startCall(input: StartCallInput): Promise<StartCallResult> {
    const config = env();

    if (
      !config.TWILIO_ACCOUNT_SID ||
      !config.TWILIO_AUTH_TOKEN ||
      !config.TWILIO_FROM_NUMBER
    ) {
      throw new AppError(
        503,
        'TWILIO_NOT_CONFIGURED',
        'Twilio não configurado.'
      );
    }

    const client = twilio(
      config.TWILIO_ACCOUNT_SID,
      config.TWILIO_AUTH_TOKEN
    );

    const call = config.TWILIO_TRIAL_MODE
      ? await client.calls.create({
          to: input.to,
          from: config.TWILIO_FROM_NUMBER,
          url: TWILIO_TRIAL_TTS_URL,
          statusCallback: input.statusUrl
        })
      : await client.calls.create({
          to: input.to,
          from: config.TWILIO_FROM_NUMBER,
          url: input.answerUrl,
          method: 'POST',
          statusCallback: input.statusUrl,
          statusCallbackMethod: 'POST',
          statusCallbackEvent: [
            'initiated',
            'ringing',
            'answered',
            'completed'
          ],
          record: input.recordingAllowed,
          ...(input.recordingAllowed
            ? {
                recordingStatusCallback: input.recordingStatusUrl,
                recordingStatusCallbackMethod: 'POST',
                recordingStatusCallbackEvent: ['completed', 'absent']
              }
            : {})
        });

    return {
      provider: 'twilio',
      providerCallId: call.sid
    };
  }
}
