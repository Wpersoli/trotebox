'use client';

import { useEffect, useState } from 'react';
import type { CreditPackSummary, WalletSummary } from '@trotebox/contracts';
import { AppShell } from '@/components/AppShell';
import { api, isPreviewMode } from '@/lib/api';

const commerceMode = process.env.NEXT_PUBLIC_COMMERCE_MODE ?? 'web';

type PixState = {
  internalPaymentId: string;
  qrCode: string;
  status: string;
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [packs, setPacks] = useState<CreditPackSummary[]>([]);
  const [pix, setPix] = useState<PixState | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.wallet().then(setWallet).catch(() => undefined);
    api.catalog().then((data) => setPacks(data.packs)).catch(() => undefined);
  }, []);

  const pixPaymentId = pix?.internalPaymentId;
  const pixStatus = pix?.status;

  useEffect(() => {
    if (!pixPaymentId || isPreviewMode || pixStatus !== 'PENDING') return;

    let active = true;
    let attempts = 0;
    const reconcile = async () => {
      if (!active || attempts >= 24) return;
      attempts += 1;
      try {
        const result = await api.mercadoPagoStatus(pixPaymentId);
        if (!active) return;
        setPix((current) => {
          if (!current || current.internalPaymentId !== pixPaymentId || current.status === result.status) return current;
          return { ...current, status: result.status };
        });
        if (result.status === 'APPROVED') api.wallet().then(setWallet).catch(() => undefined);
      } catch {
        // O webhook continua sendo o caminho primário. Uma falha transitória
        // na consulta ativa não deve apagar o Pix nem induzir nova cobrança.
      }
    };

    void reconcile();
    const timer = window.setInterval(() => void reconcile(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [pixPaymentId, pixStatus]);

  async function mercadoPago(code: string) {
    setError('');
    try {
      const result = await api.pix(code);
      setPix({ internalPaymentId: result.internalPaymentId, qrCode: result.qrCode, status: 'PENDING' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao criar o Pix.');
    }
  }

  const pixApproved = pix?.status === 'APPROVED';
  const pixFailed = pix && ['REJECTED', 'CANCELED', 'REFUNDED', 'CHARGEBACK'].includes(pix.status);

  return (
    <AppShell title="Créditos">
      <section className="card balance-card" style={{ marginBottom: 22 }}>
        <div><span className="eyebrow">Saldo disponível</span><div className="pack-credits">{wallet?.balanceCredits ?? '—'}</div><p className="muted">Reservados: {wallet?.reservedCredits ?? '—'}</p></div>
        <div className="balance-symbol" aria-hidden="true">★</div>
      </section>

      {isPreviewMode && <div className="notice" style={{ marginBottom: 20 }}><strong>Preview local:</strong> os pacotes e o Pix abaixo são demonstrativos. Nenhuma cobrança real é criada.</div>}

      {commerceMode === 'web' ? (
        <>
          {error && <div className="error-box" style={{ marginBottom: 18 }}>{error}</div>}
          {pix && (
            <div className="card form-panel" style={{ marginBottom: 18 }}>
              <span className="eyebrow">Pix · Mercado Pago</span>
              <h2 style={{ marginBottom: 8 }}>{pixApproved ? 'Pagamento confirmado' : pixFailed ? 'Pagamento não concluído' : 'Aguardando confirmação'}</h2>
              <p className="muted">
                {isPreviewMode
                  ? 'No preview, o código abaixo é apenas demonstrativo.'
                  : pixApproved
                    ? 'O provedor confirmou o pagamento e o saldo foi conciliado no servidor.'
                    : pixFailed
                      ? 'Nenhum crédito foi liberado para este pagamento.'
                      : 'O Pix está vinculado ao seu e-mail autenticado. O saldo só é liberado após confirmação do Mercado Pago; a tela também reconcilia o status caso um webhook atrase.'}
              </p>
              {!pixApproved && !pixFailed && <textarea className="input" style={{ minHeight: 110, paddingTop: 12 }} readOnly value={pix.qrCode} />}
              {!isPreviewMode && !pixApproved && !pixFailed && <div className="status-pill warn" style={{ marginTop: 12 }}>Conferindo pagamento</div>}
              {pixApproved && <div className="status-pill ok" style={{ marginTop: 12 }}>Créditos liberados</div>}
              {pixFailed && <div className="status-pill fail" style={{ marginTop: 12 }}>Sem crédito</div>}
            </div>
          )}
          <div className="pack-grid">
            {packs.map((pack, index) => (
              <article className={`card pack-card ${index === 1 ? 'highlight' : ''}`} key={pack.code}>
                {index === 1 && <span className="popular-tag">Mais escolhido</span>}
                <span className="eyebrow">{pack.name}</span>
                <div className="pack-credits">{pack.credits}</div>
                <div className="pack-price">créditos · {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pack.priceCents / 100)}</div>
                <div className="payment-options payment-options-single">
                  <button className="button" onClick={() => mercadoPago(pack.code)}>Comprar com Pix · Mercado Pago</button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <section className="card form-panel">
          <span className="eyebrow">Comércio nativo protegido</span>
          <h2>Compras externas estão desativadas nesta compilação.</h2>
          <p className="muted">Antes da publicação em lojas, conecte o mecanismo de cobrança exigido ou permitido para cada plataforma e território.</p>
        </section>
      )}
    </AppShell>
  );
}
