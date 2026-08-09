import { AppError } from './http';
import { maskPhone, PhonePolicyViolation, validateRecipientCore } from './phone-policy-core';

export { maskPhone };

export function validateRecipient(phone: string) {
  try {
    return validateRecipientCore(phone);
  } catch (cause) {
    if (cause instanceof PhonePolicyViolation) {
      throw new AppError(cause.status, cause.code, cause.message);
    }
    throw cause;
  }
}
