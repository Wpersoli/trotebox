import { env } from './env';

export type PlatformCapabilities = {
  pixPayments: boolean;
  outboundCalls: boolean;
};

export function platformCapabilities(config = env()): PlatformCapabilities {
  const pixPayments = Boolean(config.MERCADOPAGO_ACCESS_TOKEN && config.MERCADOPAGO_WEBHOOK_SECRET);

  const outboundCalls = config.TELEPHONY_PROVIDER === 'twilio'
    ? Boolean(config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN && config.TWILIO_FROM_NUMBER)
    : config.TELEPHONY_PROVIDER === 'vonage'
      ? Boolean(
        config.VONAGE_APPLICATION_ID
        && config.VONAGE_PRIVATE_KEY
        && config.VONAGE_FROM_NUMBER
        && config.VONAGE_SIGNATURE_SECRET
        && config.VONAGE_API_KEY
      )
      : config.NODE_ENV !== 'production';

  return { pixPayments, outboundCalls };
}
