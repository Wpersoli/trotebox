export type PhonePolicyCode =
  | 'EMERGENCY_NUMBER_BLOCKED'
  | 'INVALID_PHONE'
  | 'SPECIAL_NUMBER_BLOCKED'
  | 'INVALID_PHONE_PATTERN';

export class PhonePolicyViolation extends Error {
  readonly status: number;
  readonly code: PhonePolicyCode;

  constructor(status: number, code: PhonePolicyCode, message: string) {
    super(message);
    this.name = 'PhonePolicyViolation';
    this.status = status;
    this.code = code;
  }
}

const brazilEmergency = new Set(['100', '180', '190', '191', '192', '193', '194', '197', '198', '199']);

export function validateRecipientCore(phone: string) {
  const normalized = phone.trim();
  if (normalized.startsWith('+55') && brazilEmergency.has(normalized.slice(3))) {
    throw new PhonePolicyViolation(403, 'EMERGENCY_NUMBER_BLOCKED', 'Números de emergência e utilidade pública são bloqueados.');
  }
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new PhonePolicyViolation(400, 'INVALID_PHONE', 'Telefone inválido. Use formato E.164.');
  }
  if (/^\+55(?:0300|0500|0800|0900)/.test(normalized)) {
    throw new PhonePolicyViolation(403, 'SPECIAL_NUMBER_BLOCKED', 'Números especiais não são permitidos.');
  }

  const nationalPart = normalized.startsWith('+55') ? normalized.slice(3) : normalized.slice(1);
  if (/^(\d)\1{7,}$/.test(nationalPart)) {
    throw new PhonePolicyViolation(400, 'INVALID_PHONE_PATTERN', 'Padrão de telefone inválido.');
  }
  return normalized;
}

export function maskPhone(phone: string) {
  if (phone.length < 8) return '••••';
  return `${phone.slice(0, 4)}••••••${phone.slice(-3)}`;
}
