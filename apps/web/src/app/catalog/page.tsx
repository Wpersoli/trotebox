'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ScriptSummary } from '@trotebox/contracts';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

export default function CatalogPage() {
  const [scripts, setScripts] = useState<ScriptSummary[]>([]);
  useEffect(() => { api.catalog().then((data) => setScripts(data.scripts)).catch(() => undefined); }, []);

  return (
    <AppShell title="Trotes">
      <div className="page-intro"><span className="eyebrow">Escolha a surpresa</span><p>Roteiros originais com estilos diferentes de humor. Veja duração, categoria e custo antes de selecionar.</p></div>
      <div className="catalog-grid">
        {scripts.map((script) => (
          <article className="card script-card" key={script.id}>
            <div className={`script-art ${script.accent}`}><span className="status-pill ok">Disponível</span><span className="script-art-icon">☎</span></div>
            <div className="script-content">
              <span className="eyebrow">{script.category}</span><h3>{script.title}</h3><p>{script.description}</p>
              <div className="script-meta"><span className="script-price">{script.creditCost} créditos</span><Link className="button secondary" href={`/calls/new/?script=${script.id}`}>Escolher</Link></div>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
