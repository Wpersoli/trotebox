'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { CreditPackSummary, WalletSummary } from '@trotebox/contracts';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/components/AuthProvider';
import { api, isPreviewMode } from '@/lib/api';

const commerceMode = process.env.NEXT_PUBLIC_COMMERCE_MODE ?? 'web';

const RECONCILE_INTERVAL_MS = 10_000;
const MAX_RECONCILE_ATTEMPTS = 90;

const failedPaymentStatuses = [
  'REJECTED',
  'CANCELED',
  'REFUNDED',
  'CHARGEBACK'
];

type PixState = {
  internalPaymentId: string;
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  expiresAt?: string;
  status: string;
};

export default function WalletPage() {
  const { user } = useAuth();
  const intentStorageKey = user ? `trotebox:pix-intent:v1:${user.id}` : null;
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [packs, setPacks] = useState<CreditPackSummary[]>([]);
  const [pix, setPix] = useState<PixState | null>(null);
  const [pixAvailable, setPixAvailable] = useState(isPreviewMode);
  const [creatingPix, setCreatingPix] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [error, setError] = useState('');
  const pendingRequest = useRef<{ code: string; key: string } | null>(null);
  const createLock = useRef(false);
  const [reconcilePaused, setReconcilePaused] = useState(false);
  const [reconcileRevision, setReconcileRevision] = useState(0);

  useEffect(() => {
    api.wallet()
      .then(setWallet)
      .catch(() => setError('Não foi possível carregar seu saldo. Atualize a página para tentar novamente.'));

    api.catalog()
      .then((data) => {
        setPacks(data.packs);
        setPixAvailable(data.capabilities.pixPayments);
      })
      .catch(() => setError('Não foi possível carregar os pacotes. Atualize a página para tentar novamente.'));
  }, []);

  const pixPaymentId = pix?.internalPaymentId;
  const pixStatus = pix?.status;

  useEffect(() => {
    if (!pixPaymentId || isPreviewMode || pixStatus !== 'PENDING') return;

    let active = true;
    let attempts = 0;
    let timer: number | undefined;

    const reconcile = async () => {
      if (!active || attempts >= MAX_RECONCILE_ATTEMPTS) return;

      attempts += 1;

      try {
        const result = await api.mercadoPagoStatus(pixPaymentId);

        if (!active) return;

        if (result.status === 'APPROVED' || failedPaymentStatuses.includes(result.status)) {
          if (intentStorageKey) {
            try { sessionStorage.removeItem(intentStorageKey); } catch { /* O estado confirmado continua visível. */ }
          }
          pendingRequest.current = null;
        }

        if (result.status === 'APPROVED') {
          const updatedWallet = await api.wallet().catch(() => null);
          if (!active) return;
          if (updatedWallet) setWallet(updatedWallet);
          else setError('Pagamento confirmado. Não foi possível atualizar o saldo; atualize a página para consultar seus créditos.');
          window.dispatchEvent(new Event('trotebox:wallet-updated'));
        }

        setPix((current) => {
          if (
            !current ||
            current.internalPaymentId !== pixPaymentId ||
            current.status === result.status
          ) {
            return current;
          }

          return {
            ...current,
            status: result.status
          };
        });

        if (result.status === 'APPROVED') {
          return;
        }

        if (failedPaymentStatuses.includes(result.status)) {
          return;
        }
      } catch {
        // O webhook continua sendo a fonte autoritativa.
        // Uma falha temporária nesta consulta não cria nova cobrança.
      }

      if (active && attempts < MAX_RECONCILE_ATTEMPTS) {
        timer = window.setTimeout(
          () => void reconcile(),
          RECONCILE_INTERVAL_MS
        );
      } else if (active) {
        setReconcilePaused(true);
      }
    };

    void reconcile();

    return () => {
      active = false;

      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [pixPaymentId, pixStatus, reconcileRevision, intentStorageKey]);

  async function copyText(value: string, message: string) {
    setError('');

    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(message);

      window.setTimeout(() => {
        setCopyFeedback('');
      }, 2500);
    } catch {
      setError(
        'Não foi possível copiar automaticamente. Selecione o conteúdo e copie manualmente.'
      );
    }
  }

  async function mercadoPago(code: string) {
    if (createLock.current || pix?.status === 'PENDING') return;
    if (!intentStorageKey) return;
    try {
      const stored = sessionStorage.getItem(intentStorageKey);
      if (stored) {
        const intent: unknown = JSON.parse(stored);
        if (!intent || typeof intent !== 'object' || !('code' in intent) || !('key' in intent)
          || typeof intent.code !== 'string' || typeof intent.key !== 'string') {
          setError('Não foi possível recuperar a solicitação anterior. Consulte o histórico de pagamentos antes de iniciar outra recarga.');
          return;
        }
        pendingRequest.current = { code: intent.code, key: intent.key };
      }
    } catch {
      setError('Não foi possível acessar a recuperação de pagamento neste navegador. Habilite o armazenamento da sessão antes de continuar.');
      return;
    }
    if (pendingRequest.current && pendingRequest.current.code !== code) {
      setError('Existe uma solicitação sem confirmação. Tente novamente o mesmo pacote para recuperar o Pix antes de escolher outro.');
      return;
    }
    createLock.current = true;

    setError('');
    setCopyFeedback('');
    setCreatingPix(true);

    try {
      pendingRequest.current ??= { code, key: crypto.randomUUID() };
      sessionStorage.setItem(intentStorageKey, JSON.stringify(pendingRequest.current));
      const result = await api.pix(code, pendingRequest.current.key);

      const nextPix: PixState = {
        internalPaymentId: result.internalPaymentId,
        qrCode: result.qrCode,
        status: 'PENDING',
        ...(
          'qrCodeBase64' in result && result.qrCodeBase64
            ? { qrCodeBase64: result.qrCodeBase64 }
            : {}
        ),
        ...(
          'ticketUrl' in result && result.ticketUrl
            ? { ticketUrl: result.ticketUrl }
            : {}
        ),
        ...(
          result.expiresAt
            ? { expiresAt: result.expiresAt }
            : {}
        )
      };

      setPix(nextPix);
      setReconcilePaused(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Falha ao criar o Pix.'
      );
    } finally {
      createLock.current = false;
      setCreatingPix(false);
    }
  }

  const pixApproved = pix?.status === 'APPROVED';

  const pixFailed = Boolean(
    pix && failedPaymentStatuses.includes(pix.status)
  );

  const pixPending = pix?.status === 'PENDING';

  const qrImageSrc = pix?.qrCodeBase64
    ? pix.qrCodeBase64.startsWith('data:')
      ? pix.qrCodeBase64
      : `data:image/png;base64,${pix.qrCodeBase64}`
    : '';

  return (
    <AppShell title="Créditos">
      <section
        className="card balance-card"
        style={{ marginBottom: 22 }}
      >
        <div>
          <span className="eyebrow">Saldo disponível</span>

          <div className="pack-credits">
            {wallet?.balanceCredits ?? '—'}
          </div>

          <p className="muted">
            Reservados: {wallet?.reservedCredits ?? '—'}
          </p>
        </div>

        <div
          className="balance-symbol"
          aria-hidden="true"
        >
          ★
        </div>
      </section>

      {isPreviewMode && (
        <div
          className="notice"
          style={{ marginBottom: 20 }}
        >
          <strong>Preview local:</strong> os pacotes e o Pix abaixo
          são demonstrativos. Nenhuma cobrança real é criada.
        </div>
      )}

      {commerceMode === 'web' ? (
        <>
          {!pixAvailable && !isPreviewMode && (
            <div
              className="notice"
              style={{ marginBottom: 18 }}
            >
              <strong>Pix em configuração:</strong> as compras estão
              temporariamente indisponíveis. Nenhuma cobrança será
              iniciada.
            </div>
          )}

          {error && (
            <div
              className="error-box"
              role="alert"
              style={{ marginBottom: 18 }}
            >
              {error}
            </div>
          )}

          {pix && (
            <div
              className="card form-panel"
              style={{ marginBottom: 18 }}
            >
              <span className="eyebrow">
                Pix · Mercado Pago
              </span>

              <h2 style={{ marginBottom: 8 }}>
                {pixApproved
                  ? 'Pagamento confirmado'
                  : pixFailed
                    ? 'Pagamento não concluído'
                    : 'Aguardando pagamento'}
              </h2>

              <p className="muted">
                {pixApproved
                  ? 'Pagamento confirmado. Os créditos foram liberados automaticamente.'
                  : pixFailed
                    ? 'Nenhum crédito foi liberado para este pagamento.'
                    : 'Pague usando o QR Code ou Pix Copia e Cola. A confirmação e a atualização do saldo são automáticas.'}
              </p>

              {pixPending && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 24,
                    alignItems: 'flex-start',
                    marginTop: 20
                  }}
                >
                  <div
                    style={{
                      width: 250,
                      maxWidth: '100%',
                      textAlign: 'center'
                    }}
                  >
                    {qrImageSrc ? (
                      <div
                        style={{
                          padding: 14,
                          background: '#fff',
                          borderRadius: 18
                        }}
                      >
                        <Image
                          src={qrImageSrc}
                          alt="QR Code Pix"
                          width={220}
                          height={220}
                          unoptimized
                          style={{
                            width: '100%',
                            height: 'auto'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="notice">
                        QR Code visual indisponível. Use o Pix
                        Copia e Cola.
                      </div>
                    )}

                    <strong
                      style={{
                        display: 'block',
                        marginTop: 10
                      }}
                    >
                      Escaneie para pagar
                    </strong>
                  </div>

                  <div
                    style={{
                      flex: '1 1 360px',
                      minWidth: 0
                    }}
                  >
                    <span className="eyebrow">
                      Pix Copia e Cola
                    </span>

                    <textarea
                      aria-label="Código Pix Copia e Cola"
                      className="input"
                      style={{
                        minHeight: 120,
                        paddingTop: 12,
                        marginTop: 8,
                        fontFamily: 'monospace'
                      }}
                      readOnly
                      value={pix.qrCode}
                    />

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                        marginTop: 12
                      }}
                    >
                      <button
                        type="button"
                        className="button"
                        onClick={() =>
                          copyText(
                            pix.qrCode,
                            'Código Pix copiado!'
                          )
                        }
                      >
                        Copiar código Pix
                      </button>

                      {pix.ticketUrl && (
                        <>
                          <button
                            type="button"
                            className="button"
                            onClick={() =>
                              copyText(
                                pix.ticketUrl!,
                                'Link de pagamento copiado!'
                              )
                            }
                          >
                            Copiar link de pagamento
                          </button>

                          <button
                            type="button"
                            className="button"
                            onClick={() =>
                              window.open(
                                pix.ticketUrl,
                                '_blank',
                                'noopener,noreferrer'
                              )
                            }
                          >
                            Abrir pagamento
                          </button>
                        </>
                      )}
                    </div>

                    {copyFeedback && (
                      <div
                        className="status-pill ok"
                        style={{ marginTop: 12 }}
                        role="status"
                      >
                        {copyFeedback}
                      </div>
                    )}

                    {!isPreviewMode && (
                      <div
                        className="status-pill warn"
                        style={{ marginTop: 16 }}
                      >
                        {reconcilePaused
                          ? 'Consulta automática pausada. Se já pagou, consulte o status antes de fazer outro pagamento.'
                          : 'Confirmação automática ativada · verificando pagamento'}
                      </div>
                    )}
                    {reconcilePaused && (
                      <button className="button" type="button" onClick={() => { setReconcilePaused(false); setReconcileRevision((value) => value + 1); }}>
                        Consultar pagamento novamente
                      </button>
                    )}
                    {pix.expiresAt && Number.isFinite(Date.parse(pix.expiresAt)) && (
                      <p className="muted">Validade informada pelo provedor: {new Date(pix.expiresAt).toLocaleString('pt-BR')}.</p>
                    )}
                  </div>
                </div>
              )}

              {pixApproved && (
                <div
                  className="status-pill ok"
                  style={{ marginTop: 12 }}
                >
                  Pagamento confirmado · créditos liberados
                </div>
              )}

              {pixFailed && (
                <div
                  className="status-pill fail"
                  style={{ marginTop: 12 }}
                >
                  Pagamento encerrado sem liberação de créditos
                </div>
              )}
            </div>
          )}

          <div className="pack-grid">
            {packs.map((pack) => {
              const blocked =
                !pixAvailable ||
                creatingPix ||
                pixPending;

              let buttonText =
                'Comprar com Pix · Mercado Pago';

              if (!pixAvailable) {
                buttonText =
                  'Pix temporariamente indisponível';
              } else if (creatingPix) {
                buttonText = 'Gerando Pix...';
              } else if (pixPending) {
                buttonText = 'Pagamento em andamento';
              }

              return (
                <article
                  className={`card pack-card ${
                    pack.highlight ? 'highlight' : ''
                  }`}
                  key={pack.code}
                >
                  {pack.highlight && (
                    <span className="popular-tag">
                      Em destaque
                    </span>
                  )}

                  <span className="eyebrow">
                    {pack.name}
                  </span>

                  <div className="pack-credits">
                    {pack.credits}
                  </div>

                  <div className="pack-price">
                    créditos ·{' '}
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(pack.priceCents / 100)}
                  </div>

                  <div className="payment-options payment-options-single">
                    <button
                      type="button"
                      className="button"
                      disabled={blocked}
                      onClick={() =>
                        mercadoPago(pack.code)
                      }
                    >
                      {buttonText}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <section className="card form-panel">
          <span className="eyebrow">
            Comércio nativo protegido
          </span>

          <h2>
            Compras externas estão desativadas nesta compilação.
          </h2>

          <p className="muted">
            Antes da publicação em lojas, conecte o mecanismo de
            cobrança exigido ou permitido para cada plataforma e
            território.
          </p>
        </section>
      )}
    </AppShell>
  );
}
