import { maskPhone, PhonePolicyViolation, validateRecipientCore } from '../apps/api/src/server/phone-policy-core.ts';
import { parseEnv } from '../apps/api/src/server/env.ts';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (cause) {
    console.error(`FAIL ${name}`);
    throw cause;
  }
}

function expectViolation(phone, code) {
  try {
    validateRecipientCore(phone);
  } catch (cause) {
    if (cause instanceof PhonePolicyViolation && cause.code === code) return;
    throw cause;
  }
  throw new Error(`Esperava bloqueio ${code} para ${phone}.`);
}

function baseEnv(overrides = {}) {
  return {
    NODE_ENV: 'development',
    PUBLIC_WEB_URL: 'http://localhost:3000',
    PUBLIC_API_URL: 'http://localhost:3001',
    ALLOWED_ORIGINS: 'http://localhost:3000',
    JWT_SECRET: 'development-secret-with-more-than-32-characters',
    DATA_ENCRYPTION_KEY: 'development-data-key-with-more-than-32-characters',
    HASH_PEPPER: 'development-hash-pepper-with-more-than-32-characters',
    AUTH_CODE_PEPPER: 'development-auth-code-pepper-with-more-than-32-characters',
    ENABLE_DEV_AUTH: 'true',
    AUTH_DELIVERY: 'console',
    TELEPHONY_PROVIDER: 'mock',
    MOCK_CALL_AUTO_COMPLETE: 'true',
    TWILIO_VALIDATE_SIGNATURES: 'true',
    ...overrides
  };
}

function productionTestEnv(overrides = {}) {
  return baseEnv({
    NODE_ENV: 'production',
    PUBLIC_WEB_URL: 'https://trotebox.example',
    PUBLIC_API_URL: 'https://api.trotebox.example',
    ALLOWED_ORIGINS: 'https://trotebox.example',
    ENABLE_DEV_AUTH: 'false',
    AUTH_DELIVERY: 'brevo',
    BREVO_API_KEY: 'brevo-key',
    EMAIL_FROM_ADDRESS: 'no-reply@trotebox.example',
    TELEPHONY_PROVIDER: 'twilio',
    MOCK_CALL_AUTO_COMPLETE: 'false',
    TWILIO_ACCOUNT_SID: 'AC123',
    TWILIO_AUTH_TOKEN: 'auth-token',
    TWILIO_FROM_NUMBER: '+5511000000000',
    TWILIO_TRIAL_MODE: 'false',
    TWILIO_VALIDATE_SIGNATURES: 'true',
    CRON_SECRET: 'cron-secret-with-at-least-16-chars',
    ...overrides
  });
}

function expectEnvFailure(overrides, message) {
  try {
    parseEnv(productionTestEnv(overrides));
  } catch (cause) {
    if (String(cause?.message ?? '').includes(message)) return;
    throw cause;
  }
  throw new Error(`Esperava falha de ambiente contendo: ${message}`);
}

test('aceita E.164 brasileiro regular', () => {
  if (validateRecipientCore('+5511999999999') !== '+5511999999999') throw new Error('Normalização divergente.');
});
test('remove espaços externos', () => {
  if (validateRecipientCore('  +5511987654321  ') !== '+5511987654321') throw new Error('Trim divergente.');
});
test('bloqueia emergência', () => expectViolation('+55190', 'EMERGENCY_NUMBER_BLOCKED'));
test('bloqueia 0800', () => expectViolation('+5508001234567', 'SPECIAL_NUMBER_BLOCKED'));
test('bloqueia padrão repetido', () => expectViolation('+5511111111111', 'INVALID_PHONE_PATTERN'));
test('bloqueia número local sem país', () => expectViolation('11999999999', 'INVALID_PHONE'));
test('mascara o telefone', () => {
  const masked = maskPhone('+5511999999999');
  if (masked !== '+551••••••999') throw new Error(`Máscara divergente: ${masked}`);
});
test('falha fechado para dev auth em produção', () => expectEnvFailure({ ENABLE_DEV_AUTH: 'true' }, 'ENABLE_DEV_AUTH'));
test('falha fechado para mock em produção', () => expectEnvFailure({ TELEPHONY_PROVIDER: 'mock' }, 'TELEPHONY_PROVIDER'));
test('falha fechado sem origens permitidas em produção', () => expectEnvFailure({ ALLOWED_ORIGINS: '' }, 'ALLOWED_ORIGINS'));
test('falha fechado para entrega console em produção', () => expectEnvFailure({ AUTH_DELIVERY: 'console' }, 'AUTH_DELIVERY'));
test('falha fechado para Twilio trial em produção', () => expectEnvFailure({ TWILIO_TRIAL_MODE: 'true' }, 'TWILIO_TRIAL_MODE'));
test('falha fechado sem segredo de cron em produção', () => expectEnvFailure({ CRON_SECRET: '' }, 'CRON_SECRET'));

test('aceita configuração de produção segura', () => {
  const parsed = parseEnv(productionTestEnv());
  if (parsed.NODE_ENV !== 'production' || parsed.ENABLE_DEV_AUTH || parsed.MOCK_CALL_AUTO_COMPLETE || parsed.TWILIO_TRIAL_MODE || !parsed.CRON_SECRET) throw new Error('Configuração segura não foi preservada.');
});

console.log(`Domain tests aprovados: ${passed}/14.`);
