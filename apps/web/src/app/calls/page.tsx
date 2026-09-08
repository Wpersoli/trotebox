'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

function statusLabel(status: unknown) {
  const value = String(status ?? 'PROCESSANDO');
  const labels: Record<string, string> = {
    COMPLETED: 'Concluído', FAILED: 'Falhou', QUEUED: 'Na fila', DIALING: 'Chamando',
    RINGING: 'Tocando', ANSWERED: 'Atendido', CANCELED: 'Cancelado', REFUNDED: 'Estornado'
  };
  return labels[value] ?? value;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.calls()
      .then((data) => { if (active) setCalls(data.calls); })
      .catch(() => { if (active) setError('Não foi possível carregar seu histórico. Atualize a página para tentar novamente.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function formatDate(value: unknown) {
    const date = new Date(String(value ?? ''));
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR');
  }

  return (
    <AppShell title="Histórico">
      <div className="page-intro"><span className="eyebrow">Seus trotes</span><p>Acompanhe as experiências recentes, o estado de cada chamada e os créditos utilizados.</p></div>
      {error && <div className="error-box" role="alert" style={{ marginBottom: 18 }}>{error}</div>}
      <div className="table-wrap" aria-busy={loading}>
        <table>
          <caption className="sr-only">Histórico de trotes e consumo de créditos</caption>
          <thead><tr><th scope="col">Trote</th><th scope="col">Destinatário</th><th scope="col">Status</th><th scope="col">Créditos</th><th scope="col">Criação</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="muted" role="status">Carregando histórico…</td></tr>}
            {!loading && calls.map((call) => <tr key={String(call.id)}><td>{String(call.scriptTitle ?? '—')}</td><td>{String(call.recipientMasked ?? 'Protegido')}</td><td><span className={`status-pill ${call.status === 'COMPLETED' ? 'ok' : call.status === 'FAILED' ? 'fail' : 'warn'}`}>{statusLabel(call.status)}</span></td><td>{String(call.creditCost ?? '—')}</td><td>{formatDate(call.createdAt)}</td></tr>)}
            {!loading && !calls.length && !error && <tr><td colSpan={5} className="muted">Nenhum trote registrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
