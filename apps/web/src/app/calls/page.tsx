'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

import { callStatusLabel, isCallActive, callCreditLabel } from '@/lib/call-status';

export default function CallsPage() {
  const [calls, setCalls] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function refresh() {
      try {
        const data = await api.calls();
        if (!active) return;
        setCalls(data.calls);
        setError('');
        if (data.calls.some((call) => isCallActive(call.status))) timer = setTimeout(() => void refresh(), 10000);
        window.dispatchEvent(new Event('trotebox:wallet-updated'));
      } catch {
        if (active) { setError('Não foi possível atualizar o histórico. Tente novamente.'); timer = setTimeout(() => void refresh(), 30000); }
      } finally { if (active) setLoading(false); }
    }
    void refresh();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [refreshToken]);

  function formatDate(value: unknown) {
    const date = new Date(String(value ?? ''));
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR');
  }

  return (
    <AppShell title="Histórico">
      <div className="page-intro"><span className="eyebrow">Seus trotes</span><p>Acompanhe as experiências recentes, o estado de cada chamada e os créditos utilizados. Chamadas em andamento são atualizadas automaticamente.</p><button className="button secondary" disabled={loading} onClick={() => { setLoading(true); setRefreshToken((value) => value + 1); }}>Atualizar histórico</button></div>
      {error && <div className="error-box" role="alert" style={{ marginBottom: 18 }}>{error}</div>}
      <div className="table-wrap" aria-busy={loading}>
        <table>
          <caption className="sr-only">Histórico de trotes e consumo de créditos</caption>
          <thead><tr><th scope="col">Trote</th><th scope="col">Destinatário</th><th scope="col">Status</th><th scope="col">Créditos</th><th scope="col">Criação</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="muted" role="status">Carregando histórico…</td></tr>}
            {!loading && calls.map((call) => <tr key={String(call.id)}><td>{String(call.scriptTitle ?? '—')}{call.recordingAvailable === true && <audio controls preload="none" src={api.recordingUrl(String(call.id))} aria-label={`Gravação de ${String(call.scriptTitle ?? 'trote')}`} style={{ display: 'block', maxWidth: 240 }} />}</td><td>{String(call.recipientMasked ?? 'Protegido')}</td><td><span className={`status-pill ${call.status === 'COMPLETED' ? 'ok' : call.status === 'FAILED' ? 'fail' : 'warn'}`}>{callStatusLabel(call.status)}</span></td><td>{String(call.creditCost ?? '—')} <small>{callCreditLabel(call.status)}</small></td><td>{formatDate(call.createdAt)}</td></tr>)}
            {!loading && !calls.length && !error && <tr><td colSpan={5} className="muted">Nenhum trote registrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
