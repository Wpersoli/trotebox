'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

function statusLabel(status: unknown) {
  const labels: Record<string, string> = {
    COMPLETED: 'Concluído',
    FAILED: 'Falhou',
    QUEUED: 'Na fila',
    DIALING: 'Chamando',
    RINGING: 'Tocando',
    ANSWERED: 'Atendido',
    CREDIT_RESERVED: 'Crédito reservado'
  };
  return labels[String(status ?? '')] ?? 'Processando';
}

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
        <article className="card stat-card"><span className="stat-card-label"><i aria-hidden="true">◈</i> Créditos disponíveis</span><strong>{wallet?.balanceCredits ?? '—'}</strong><small>Prontos para a próxima surpresa</small></article>
        <article className="card stat-card"><span className="stat-card-label"><i aria-hidden="true">↗</i> Créditos reservados</span><strong>{wallet?.reservedCredits ?? '—'}</strong><small>Em chamadas ativas</small></article>
        <article className="card stat-card"><span className="stat-card-label"><i aria-hidden="true">↺</i> Trotes recentes</span><strong>{calls.length}</strong><small>Chamadas no seu histórico</small></article>
        <article className="card hero-panel">
          <div className="hero-panel-copy">
            <span className="eyebrow">Próxima surpresa</span>
            <h2>Prepare a surpresa perfeita.</h2>
            <p>Escolha um roteiro, confirme o contato autorizado e acompanhe cada etapa pelo painel.</p>
            <div className="hero-panel-actions">
              <Link href="/catalog/" className="button">Escolher um trote</Link>
              <Link href="/wallet/" className="button secondary">Recarregar créditos</Link>
            </div>
          </div>
          <Image className="dashboard-mascot" src="/brand/trotebox-mascot.webp" alt="" width={715} height={895} sizes="(max-width: 700px) 215px, (max-width: 980px) 39vw, 330px" aria-hidden="true" />
        </article>
        <aside className="card activity-panel">
          <div className="activity-heading"><span className="eyebrow">Últimos trotes</span><Link href="/calls/">Ver tudo</Link></div>
          <div className="activity-list">
            {calls.slice(0, 4).map((call, index) => <div className="activity-item" key={String(call.id ?? index)}><div className="activity-dot" aria-hidden="true">☎</div><div><strong>{String(call.scriptTitle ?? 'Trote')}</strong><span>{statusLabel(call.status)}</span></div></div>)}
            {!calls.length && <p className="muted">Nenhum trote criado ainda.</p>}
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
