import type { CallStatus } from '@trotebox/db';
import { env } from '../env';
import { mapTwilioStatus, mapVonageStatus } from '../provider-status';
import { createVonageJwt } from './vonage';
import { AppError } from '../http';

export async function readProviderCallStatus(provider: string, providerCallId: string): Promise<CallStatus | undefined> {
  const config = env();
  if (provider === 'twilio') {
    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) throw new AppError(503, 'TWILIO_NOT_CONFIGURED', 'Operadora indisponível.');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.TWILIO_ACCOUNT_SID)}/Calls/${encodeURIComponent(providerCallId)}.json`;
    const response = await fetch(url, { headers: { Authorization: `Basic ${Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString('base64')}` }, signal: AbortSignal.timeout(8000), cache: 'no-store', redirect: 'error' });
    if (!response.ok) throw new AppError(502, 'CALL_LOOKUP_FAILED', 'Não foi possível confirmar a chamada.');
    const payload = await response.json() as { sid?: string; status?: string };
    if (payload.sid !== providerCallId) throw new AppError(502, 'CALL_LOOKUP_MISMATCH', 'Identificador da operadora divergente.');
    return mapTwilioStatus(payload.status ?? '');
  }
  if (provider === 'vonage') {
    if (!config.VONAGE_APPLICATION_ID || !config.VONAGE_PRIVATE_KEY) throw new AppError(503, 'VONAGE_NOT_CONFIGURED', 'Operadora indisponível.');
    const jwt = await createVonageJwt(config.VONAGE_APPLICATION_ID, config.VONAGE_PRIVATE_KEY);
    const response = await fetch(`https://api.nexmo.com/v1/calls/${encodeURIComponent(providerCallId)}`, { headers: { Authorization: `Bearer ${jwt}` }, signal: AbortSignal.timeout(8000), cache: 'no-store', redirect: 'error' });
    if (!response.ok) throw new AppError(502, 'CALL_LOOKUP_FAILED', 'Não foi possível confirmar a chamada.');
    const payload = await response.json() as { uuid?: string; status?: string };
    if (payload.uuid !== providerCallId) throw new AppError(502, 'CALL_LOOKUP_MISMATCH', 'Identificador da operadora divergente.');
    return mapVonageStatus(payload.status ?? '');
  }
  return undefined;
}
