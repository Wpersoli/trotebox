import { env } from '../env';
import { MockTelephonyProvider } from './mock';
import { TwilioTelephonyProvider } from './twilio';
import { VonageTelephonyProvider } from './vonage';
import type { TelephonyProvider } from './types';

export function telephonyProvider(): TelephonyProvider {
  switch (env().TELEPHONY_PROVIDER) {
    case 'twilio': return new TwilioTelephonyProvider();
    case 'vonage': return new VonageTelephonyProvider();
    default: return new MockTelephonyProvider();
  }
}
