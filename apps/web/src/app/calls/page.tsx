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
  useEffect(() => { api.calls().then((data) => setCalls(data.calls)).catch(() => undefined); }, []);

  return (
    <AppShell title="Histórico">
      <div className="page-intro"><span className="eyebrow">Seus trotes</span><p>Acompanhe as experiências recentes, o estado de cada chamada e os créditos utilizados.</p></div>
      <div className="table-wrap">
        <table><thead><tr><th>Trote</th><th>Destinatário</th><th>Status</th><th>Créditos</th><th>Criação</th></tr></thead>
        <tbody>{calls.map((call) => <tr key={String(call.id)}><td>{String(call.scriptTitle ?? '—')}</td><td>{String(call.recipientMasked ?? 'Protegido')}</td><td><span className={`status-pill ${call.status === 'COMPLETED' ? 'ok' : call.status === 'FAILED' ? 'fail' : 'warn'}`}>{statusLabel(call.status)}</span></td><td>{String(call.creditCost ?? '—')}</td><td>{new Date(String(call.createdAt)).toLocaleString('pt-BR')}</td></tr>)}
        {!calls.length && <tr><td colSpan={5} className="muted">Nenhum trote registrado.</td></tr>}</tbody></table>
      </div>
    </AppShell>
  );
}
