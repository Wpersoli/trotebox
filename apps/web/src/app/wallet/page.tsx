'use client';

import { useEffect, useState } from 'react';
import type { CreditPackSummary, WalletSummary } from '@trotebox/contracts';
import { AppShell } from '@/components/AppShell';
import { api, isPreviewMode } from '@/lib/api';

const commerceMode = process.env.NEXT_PUBLIC_COMMERCE_MODE ?? 'web';

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [packs, setPacks] = useState<CreditPackSummary[]>([]);
  const [email, setEmail] = useState('demo@trotebox.local');
  const [pix, setPix] = useState<{ qrCode: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.wallet().then(setWallet).catch(() => undefined);
    api.catalog().then((data) => setPacks(data.packs)).catch(() => undefined);
  }, []);

  async function stripe(code: string) {
    setError('');
    try {
      const result = await api.stripeCheckout(code);
      window.location.href = result.checkoutUrl;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha no Stripe.');
    }
  }

  async function mercadoPago(code: string) {
    setError('');
    try {
      const result = await api.pix(code, email);
      setPix({ qrCode: result.qrCode });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha no Pix.');
    }
  }

  return (
    <AppShell title="Créditos">
      <section className="card balance-card" style={{ marginBottom: 22 }}>
        <div><span className="eyebrow">Saldo disponível</span><div className="pack-credits">{wallet?.balanceCredits ?? '—'}</div><p className="muted">Reservados: {wallet?.reservedCredits ?? '—'}</p></div>
        <div className="balance-symbol" aria-hidden="true">★</div>
      </section>

      {isPreviewMode && <div className="notice" style={{ marginBottom: 20 }}><strong>Preview local:</strong> os pacotes e o Pix abaixo são demonstrativos. Nenhuma cobrança real é criada.</div>}

      {commerceMode === 'web' ? (
        <>
          <div className="field" style={{ maxWidth: 430, marginBottom: 20 }}>
            <label htmlFor="payer-email">E-mail do pagador para Pix</label>
            <input id="payer-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {error && <div className="error-box" style={{ marginBottom: 18 }}>{error}</div>}
          {pix && (
            <div className="card form-panel" style={{ marginBottom: 18 }}>
              <span className="eyebrow">Pix demonstrativo</span>
              <p className="muted">Em produção, o saldo será liberado somente após a confirmação assinada do provedor.</p>
              <textarea className="input" style={{ minHeight: 110, paddingTop: 12 }} readOnly value={pix.qrCode} />
            </div>
          )}
          <div className="pack-grid">
            {packs.map((pack, index) => (
              <article className={`card pack-card ${index === 1 ? 'highlight' : ''}`} key={pack.code}>
                {index === 1 && <span className="popular-tag">Mais escolhido</span>}
                <span className="eyebrow">{pack.name}</span>
                <div className="pack-credits">{pack.credits}</div>
                <div className="pack-price">créditos · {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pack.priceCents / 100)}</div>
                <div className="payment-options">
                  <button className="button secondary" onClick={() => mercadoPago(pack.code)}>Pix</button>
                  <button className="button" onClick={() => stripe(pack.code)}>{isPreviewMode ? 'Simular cartão' : 'Cartão'}</button>
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
