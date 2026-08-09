'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const [wallet, setWallet] = useState<{ balanceCredits: number; reservedCredits: number } | null>(null);
  const [calls, setCalls] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    api.wallet().then(setWallet).catch(() => undefined);
    api.calls().then((data) => setCalls(data.calls)).catch(() => undefined);
  }, []);

  return (
    <AppShell title="Visão geral">
      <section className="dashboard-grid">
        <article className="card stat-card"><span>Créditos disponíveis</span><strong>{wallet?.balanceCredits ?? '—'}</strong><small>Prontos para usar</small></article>
        <article className="card stat-card"><span>Créditos reservados</span><strong>{wallet?.reservedCredits ?? '—'}</strong><small>Em chamadas ativas</small></article>
        <article className="card stat-card"><span>Trotes recentes</span><strong>{calls.length}</strong><small>No histórico atual</small></article>
        <article className="card hero-panel">
          <div className="hero-panel-copy">
            <span className="eyebrow">Próxima surpresa</span>
            <h2>Abra a caixa e escolha o próximo trote.</h2>
            <p>Encontre o roteiro certo, confirme o contato autorizado e acompanhe a execução pelo painel.</p>
            <Link href="/catalog/" className="button" style={{ marginTop: 18 }}>Escolher um trote</Link>
          </div>
          <Image className="dashboard-mascot" src="/brand/trotebox-mascot.webp" alt="" width={715} height={895} sizes="(max-width: 700px) 215px, (max-width: 980px) 39vw, 330px" aria-hidden="true" />
        </article>
        <aside className="card activity-panel">
          <span className="eyebrow">Últimos trotes</span>
          <div className="activity-list">
            {calls.slice(0, 4).map((call, index) => <div className="activity-item" key={String(call.id ?? index)}><div className="activity-dot">☎</div><div><strong>{String(call.scriptTitle ?? 'Trote')}</strong><span>{String(call.status ?? 'PROCESSANDO')}</span></div></div>)}
            {!calls.length && <p className="muted">Nenhum trote criado ainda.</p>}
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
