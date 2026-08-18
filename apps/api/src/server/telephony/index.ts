import { env } from '../env';
import { AppError } from '../http';
import type { TelephonyProvider } from './types';

export async function telephonyProvider(): Promise<TelephonyProvider> {
  const config = env();

  switch (config.TELEPHONY_PROVIDER) {
    case 'twilio': {
      const { TwilioTelephonyProvider } = await import('./twilio');
      return new TwilioTelephonyProvider();
    }
    case 'vonage': {
      const { VonageTelephonyProvider } = await import('./vonage');
      return new VonageTelephonyProvider();
    }
    default: {
      if (config.NODE_ENV === 'production') {
        throw new AppError(503, 'TELEPHONY_NOT_CONFIGURED', 'Telefonia temporariamente indisponível.');
      }
      const { MockTelephonyProvider } = await import('./mock');
      return new MockTelephonyProvider();
    }
  }
}
