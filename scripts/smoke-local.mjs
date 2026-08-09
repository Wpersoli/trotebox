import { randomUUID } from 'node:crypto';

const apiBase = (process.env.SMOKE_API_BASE_URL ?? 'http://localhost:3001/api/v1').replace(/\/$/, '');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} falhou (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

const timestamp = Date.now();
const email = `smoke+${timestamp}@trotebox.local`;
const phoneSuffix = String(timestamp).slice(-8).replace(/^0/, '8');
const phone = `+55119${phoneSuffix}`;

console.log(`Smoke test em ${apiBase}`);

const health = await request('/health');
assert(health.status === 'ok', 'Health check não retornou status ok.');

const auth = await request('/auth/dev-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, displayName: 'Smoke Test' })
});
assert(auth.token, 'Token de desenvolvimento ausente.');
const headers = { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' };

const catalog = await request('/catalog', { headers });
assert(Array.isArray(catalog.scripts) && catalog.scripts.length > 0, 'Catálogo sem roteiros.');
assert(Array.isArray(catalog.packs) && catalog.packs.length > 0, 'Catálogo sem pacotes de crédito.');

const walletBefore = await request('/wallet', { headers });
assert(Number.isInteger(walletBefore.balanceCredits), 'Saldo inicial inválido.');

const script = catalog.scripts[0];
const created = await request('/calls', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    scriptId: script.id,
    recipientPhone: phone,
    recipientLabel: 'Teste automatizado local',
    consentConfirmed: true,
    recordingConsentConfirmed: false,
    idempotencyKey: randomUUID()
  })
});
assert(created.call?.id, 'Chamada simulada sem identificador.');

const calls = await request('/calls', { headers });
assert(calls.calls.some((call) => call.id === created.call.id), 'Chamada criada não apareceu no histórico.');

const walletAfter = await request('/wallet', { headers });
assert(walletAfter.reservedCredits === 0, 'Mock automático deixou créditos reservados.');
assert(walletAfter.balanceCredits === walletBefore.balanceCredits - script.creditCost, 'Captura de créditos divergente.');

console.log(JSON.stringify({
  result: 'approved',
  health: health.status,
  user: email,
  callId: created.call.id,
  callStatus: created.call.status,
  balanceBefore: walletBefore.balanceCredits,
  balanceAfter: walletAfter.balanceCredits
}, null, 2));
