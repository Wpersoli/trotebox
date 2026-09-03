import { z } from 'zod';

const optionalUrl = z.preprocess((value) => value === '' ? undefined : value, z.string().url().optional());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PUBLIC_WEB_URL: z.string().url().default('http://localhost:3000'),
  PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  JWT_SECRET: z.string().min(32),
  DATA_ENCRYPTION_KEY: z.string().min(32),
  HASH_PEPPER: z.string().min(32),
  ENABLE_DEV_AUTH: z.string().default('false').transform((v) => v === 'true'),
  AUTH_DELIVERY: z.enum(['console', 'brevo']).default('console'),
  AUTH_CODE_PEPPER: z.string().min(32),
  AUTH_CODE_TTL_MINUTES: z.coerce.number().int().min(3).max(10).default(7),
  BREVO_API_KEY: z.string().optional(),
  EMAIL_FROM_NAME: z.string().trim().min(1).max(80).default('TroteBox'),
  EMAIL_FROM_ADDRESS: z.preprocess((value) => value === '' ? undefined : value, z.string().email().optional()),
  TELEPHONY_PROVIDER: z.enum(['mock', 'twilio', 'vonage']).default('mock'),
  MOCK_CALL_AUTO_COMPLETE: z.string().default('true').transform((v) => v === 'true'),
  VOICE_ENGINE: z.enum(['provider', 'custom']).default('provider'),
  CUSTOM_TTS_URL: optionalUrl,
  CUSTOM_TTS_API_KEY: z.string().optional(),
  CUSTOM_TTS_ALLOWED_HOSTS: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  TWILIO_TRIAL_MODE: z.string().default('false').transform((v) => v === 'true'),
  TWILIO_VALIDATE_SIGNATURES: z.string().default('true').transform((v) => v === 'true'),
  VONAGE_APPLICATION_ID: z.string().optional(),
  VONAGE_API_KEY: z.string().optional(),
  VONAGE_PRIVATE_KEY: z.string().optional(),
  VONAGE_FROM_NUMBER: z.string().optional(),
  VONAGE_SIGNATURE_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
  CRON_SECRET: z.string().min(16).optional(),
  RECORDING_ENABLED: z.string().default('false').transform((v) => v === 'true'),
  RECORDING_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  MAX_CALLS_PER_USER_PER_HOUR: z.coerce.number().int().min(1).max(100).default(5),
  MAX_CALLS_PER_RECIPIENT_PER_DAY: z.coerce.number().int().min(1).max(20).default(2)
});

export function parseEnv(input: NodeJS.ProcessEnv) {
  return schema.parse(input);
}

let cache: z.infer<typeof schema> | undefined;
export function env() {
  cache ??= parseEnv(process.env);
  return cache;
}
