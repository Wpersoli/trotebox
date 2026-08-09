import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from './env';

function key() { return createHash('sha256').update(env().DATA_ENCRYPTION_KEY).digest(); }

export function hashSubject(value: string) {
  return createHmac('sha256', env().HASH_PEPPER).update(value.trim().toLowerCase()).digest('hex');
}

export function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decrypt(value: string) {
  const input = Buffer.from(value, 'base64url');
  const iv = input.subarray(0, 12);
  const tag = input.subarray(12, 28);
  const encrypted = input.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function sha256(value: string | Buffer) { return createHash('sha256').update(value).digest('hex'); }

export function safeEqualHex(left: string, right: string) {
  if (!left || !right || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}
