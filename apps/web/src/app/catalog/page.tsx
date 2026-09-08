'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ScriptSummary } from '@trotebox/contracts';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

const waveformHeights = [18, 34, 24, 46, 29, 54, 23, 39, 18, 48, 27, 36, 20, 42, 25];

export default function CatalogPage() {
  const [scripts, setScripts] = useState<ScriptSummary[]>([]);
  const [outboundCallsAvailable, setOutboundCallsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.catalog()
      .then((data) => {
        if (!active) return;
        setScripts(data.scripts);
        setOutboundCallsAvailable(data.capabilities.outboundCalls);
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar o catálogo. Atualize a página para tentar novamente.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <AppShell title="Trotes">
      <div className="page-intro catalog-intro"><div><span className="eyebrow">Escolha a surpresa</span><p>Roteiros originais com estilos diferentes de humor. Veja duração, categoria e custo antes de selecionar.</p></div><span className="catalog-count" aria-live="polite">{loading ? 'Carregando catálogo…' : `${scripts.length} experiências disponíveis`}</span></div>
      {error && <div className="error-box" role="alert" style={{ marginBottom: 18 }}>{error}</div>}
      {!loading && !error && !scripts.length && <div className="notice" role="status">Nenhuma experiência está disponível no momento.</div>}
      <div className="catalog-grid" aria-busy={loading}>
        {scripts.map((script) => (
          <article className="card script-card" key={script.id}>
            <div className={`script-art ${script.accent}`}>
              <div className="script-art-top"><span className="script-art-category">{script.category}</span><span className={`status-pill ${outboundCallsAvailable ? 'ok' : 'warn'}`}>{outboundCallsAvailable ? 'Disponível' : 'Em configuração'}</span></div>
              <span className="script-art-icon" aria-hidden="true">☎</span>
              <div className="script-wave" aria-hidden="true">{waveformHeights.map((height, index) => <i key={index} style={{ height }} />)}</div>
            </div>
            <div className="script-content">
              <h3>{script.title}</h3><p>{script.description}</p>
              <div className="script-meta"><span className="script-price">{script.creditCost} créditos</span><span className="script-duration">{script.durationSeconds}s · roteiro completo</span></div>
              <div className="script-cta">{outboundCallsAvailable ? <Link className="button secondary" href={`/calls/new/?script=${script.id}`}>Escolher trote <span aria-hidden="true">→</span></Link> : <span className="button secondary disabled" aria-disabled="true">Em breve</span>}</div>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
