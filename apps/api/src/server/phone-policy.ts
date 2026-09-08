import { AppError } from './http';
import { maskPhone, PhonePolicyViolation, validateRecipientCore } from './phone-policy-core';

export { maskPhone };

const DEFAULT_RECIPIENT_PREFIXES = '+55';

function configuredRecipientPrefixes() {
  const raw = process.env.ALLOWED_RECIPIENT_PREFIXES?.trim() || DEFAULT_RECIPIENT_PREFIXES;
  const prefixes = raw.split(',').map((value) => value.trim()).filter(Boolean);
  if (!prefixes.length || !prefixes.every((prefix) => /^\+[1-9]\d{0,2}$/.test(prefix))) {
    throw new AppError(500, 'RECIPIENT_POLICY_MISCONFIGURED', 'Política de destinos de telefonia inválida.');
  }
  return prefixes;
}

export function validateRecipient(phone: string) {
  let normalized: string;
  try {
    normalized = validateRecipientCore(phone);
  } catch (cause) {
    if (cause instanceof PhonePolicyViolation) {
      throw new AppError(cause.status, cause.code, cause.message);
    }
    throw cause;
  }

  if (!configuredRecipientPrefixes().some((prefix) => normalized.startsWith(prefix))) {
    throw new AppError(403, 'DESTINATION_NOT_ALLOWED', 'Destino de telefonia não habilitado para este serviço.');
  }
  return normalized;
}
