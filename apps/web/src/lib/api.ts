import type { CreditPackSummary, ScriptSummary, WalletSummary } from '@trotebox/contracts';

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';
const requestTimeoutMs = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 10000);
const clientPlatform = process.env.NEXT_PUBLIC_CLIENT_PLATFORM ?? 'web';
export const isPreviewMode = process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true';

const previewScripts: ScriptSummary[] = [
  { id: 'cm0trotebox0001preview', slug: 'entrega-impossivel', title: 'Entrega impossível', category: 'Comédia leve', description: 'Uma entrega completamente absurda vira o centro de uma conversa divertida, com encerramento claramente humorístico.', creditCost: 3, durationSeconds: 65, accent: 'orange' },
  { id: 'cm0trotebox0002preview', slug: 'pesquisa-muito-seria', title: 'Pesquisa muito séria', category: 'Humor nonsense', description: 'Uma pesquisa fictícia começa normal e rapidamente descamba para perguntas improváveis e respostas inesperadas.', creditCost: 4, durationSeconds: 78, accent: 'purple' },
  { id: 'cm0trotebox0003preview', slug: 'vizinho-premiado', title: 'Vizinho premiado', category: 'Surpresa', description: 'Um prêmio de vizinhança fictício cria uma sequência de situações engraçadas sem pedir dados sensíveis.', creditCost: 5, durationSeconds: 92, accent: 'green' },
  { id: 'cm0trotebox0004preview', slug: 'clube-dos-atrasados', title: 'Clube dos atrasados', category: 'Cotidiano', description: 'Um clube muito exclusivo tenta recrutar a pessoa por um motivo tão específico quanto improvável.', creditCost: 3, durationSeconds: 70, accent: 'yellow' },
  { id: 'cm0trotebox0005preview', slug: 'assistente-confuso', title: 'Assistente confuso', category: 'Tecnologia', description: 'Um assistente virtual atrapalhado tenta resolver um problema simples e transforma tudo em uma pequena comédia.', creditCost: 4, durationSeconds: 82, accent: 'red' },
  { id: 'cm0trotebox0006preview', slug: 'mensagem-do-futuro', title: 'Mensagem do futuro', category: 'Ficção', description: 'Uma personagem fictícia do futuro traz uma mensagem urgente que, na verdade, é totalmente ridícula.', creditCost: 5, durationSeconds: 96, accent: 'purple' }
];

const previewPacks: CreditPackSummary[] = [
  { code: 'starter', name: 'Caixinha', credits: 15, priceCents: 1490, currency: 'BRL' },
  { code: 'plus', name: 'Risada', credits: 40, priceCents: 2990, currency: 'BRL', highlight: true },
  { code: 'pro', name: 'Gargalhada', credits: 100, priceCents: 5990, currency: 'BRL' }
];

const previewWallet: WalletSummary = {
  balanceCredits: 36,
  reservedCredits: 0,
  recentEntries: [
    { id: 'wallet-1', type: 'CREDIT', amountCredits: 40, description: 'Pacote Risada', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'wallet-2', type: 'CAPTURE', amountCredits: -4, description: 'Pesquisa muito séria', createdAt: new Date(Date.now() - 86400000).toISOString() }
  ]
};

const previewCalls: Array<Record<string, unknown>> = [
  { id: 'call-preview-1', scriptTitle: 'Pesquisa muito séria', recipientMasked: '+55 11 *****-4831', status: 'COMPLETED', creditCost: 4, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'call-preview-2', scriptTitle: 'Entrega impossível', recipientMasked: '+55 21 *****-7720', status: 'COMPLETED', creditCost: 3, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'call-preview-3', scriptTitle: 'Mensagem do futuro', recipientMasked: '+55 31 *****-2107', status: 'FAILED', creditCost: 5, createdAt: new Date(Date.now() - 86400000 * 5).toISOString() }
];

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'API_ERROR') {
    super(message);
    this.name = 'ApiError';
  }
}

type ErrorPayload = { error?: { code?: string } } | null;

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = requestTimeoutMs): Promise<T> {
  const controller = new AbortController();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  headers.set('X-Client-Platform', clientPlatform);
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 10000);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal
    });

    const payload = await response.json().catch(() => null) as ErrorPayload | T;
    if (!response.ok) {
      const errorPayload = payload as ErrorPayload;
      throw new ApiError(response.status, 'Não foi possível completar a solicitação.', errorPayload?.error?.code ?? 'API_ERROR');
    }
    return payload as T;
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new ApiError(408, 'A solicitação demorou demais e foi cancelada.', 'REQUEST_TIMEOUT');
    }
    throw new ApiError(0, 'Falha de conexão com o servidor.', 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
  }
}

function previewUser(email: string, displayName: string) {
  return { token: 'preview-trotebox-token', user: { id: 'preview-user', email, displayName } };
}

export const api = {
  requestAuthCode: async (email: string, displayName: string) => isPreviewMode
    ? { accepted: true, devCode: '123456' }
    : request<{ accepted: boolean; devCode?: string }>('/auth/request-code', { method: 'POST', body: JSON.stringify({ email, displayName }) }),

  verifyAuthCode: async (email: string, code: string) => {
    if (isPreviewMode) {
      if (code !== '123456') throw new ApiError(401, 'No preview, use o código 123456.', 'PREVIEW_CODE');
      return previewUser(email, 'Conta Demonstração');
    }
    return request<{ token?: string; user: { id: string; email: string; displayName: string } }>('/auth/verify-code', { method: 'POST', body: JSON.stringify({ email, code }) });
  },

  devLogin: async (email: string, displayName: string) => isPreviewMode
    ? previewUser(email, displayName)
    : request<{ token?: string; user: { id: string; email: string; displayName: string } }>('/auth/dev-login', { method: 'POST', body: JSON.stringify({ email, displayName }) }),

  session: async () => isPreviewMode
    ? previewUser('demo@trotebox.local', 'Conta Demonstração')
    : request<{ user: { id: string; email: string; displayName: string } }>('/auth/session'),

  logout: async () => isPreviewMode ? { ok: true } : request<{ ok: true }>('/auth/logout', { method: 'POST' }),

  catalog: async () => isPreviewMode ? { scripts: previewScripts, packs: previewPacks } : request<{ scripts: ScriptSummary[]; packs: CreditPackSummary[] }>('/catalog'),
  wallet: async () => isPreviewMode ? previewWallet : request<WalletSummary>('/wallet'),
  calls: async () => isPreviewMode ? { calls: previewCalls } : request<{ calls: Array<Record<string, unknown>> }>('/calls'),

  createCall: async (input: Record<string, unknown>) => {
    if (isPreviewMode) {
      const script = previewScripts.find((item) => item.id === input.scriptId);
      const call = { id: `preview-${Date.now()}`, scriptTitle: script?.title ?? 'Trote', recipientMasked: '+55 ** *****-****', status: 'QUEUED', creditCost: script?.creditCost ?? 0, createdAt: new Date().toISOString() };
      previewCalls.unshift(call);
      return { call };
    }
    return request<{ call: Record<string, unknown> }>('/calls', { method: 'POST', body: JSON.stringify(input) });
  },

  stripeCheckout: async (packCode: string) => isPreviewMode
    ? { checkoutUrl: `/wallet/?preview=stripe&pack=${encodeURIComponent(packCode)}` }
    : request<{ checkoutUrl: string }>('/payments/stripe/checkout', { method: 'POST', body: JSON.stringify({ packCode, idempotencyKey: crypto.randomUUID() }) }),

  pix: async (packCode: string, payerEmail: string) => isPreviewMode
    ? { paymentId: 'preview-pix', qrCode: `00020126TROTEBOX-PREVIEW-${packCode}-${payerEmail}`, expiresAt: new Date(Date.now() + 1800000).toISOString() }
    : request<{ paymentId: string; qrCode: string; qrCodeBase64?: string; expiresAt?: string }>('/payments/mercadopago/pix', { method: 'POST', body: JSON.stringify({ packCode, payerEmail, idempotencyKey: crypto.randomUUID() }) })
};
