import { maskPhone, PhonePolicyViolation, validateRecipientCore } from '../apps/api/src/server/phone-policy-core.ts';

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

console.log(`Domain tests aprovados: ${passed}/7.`);
