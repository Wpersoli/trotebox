'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ScriptSummary } from '@trotebox/contracts';
import { AppShell } from '@/components/AppShell';
import { api, isPreviewMode } from '@/lib/api';

export default function NewCallPage() {
  const [scripts, setScripts] = useState<ScriptSummary[]>([]);
  const [scriptId, setScriptId] = useState('');
  const [phone, setPhone] = useState('+55');
  const [label, setLabel] = useState('');
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const requestedScript = new URLSearchParams(window.location.search).get('script') ?? '';
    api.catalog()
      .then((data) => {
        setScripts(data.scripts);
        const exists = data.scripts.some((item) => item.id === requestedScript);
        setScriptId(exists ? requestedScript : (data.scripts[0]?.id ?? ''));
      })
      .catch(() => undefined);
  }, []);
  const selected = useMemo(() => scripts.find((item) => item.id === scriptId), [scripts, scriptId]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      const result = await api.createCall({ scriptId, recipientPhone: phone.replace(/[\s()-]/g, ''), recipientLabel: label || undefined, consentConfirmed: consent, recordingConsentConfirmed: recording, idempotencyKey: crypto.randomUUID() });
      setSuccess(isPreviewMode ? `Simulação criada com sucesso: ${String(result.call.scriptTitle ?? 'Trote')}. Nenhuma ligação real foi realizada.` : `Trote criado com sucesso. Identificador: ${String(result.call.id)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível criar o trote.'); }
    finally { setBusy(false); }
  }

  return (
    <AppShell title="Novo trote">
      <form className="form-grid" onSubmit={submit}>
        <section className="card form-panel form-stack">
          {isPreviewMode && <div className="notice"><strong>Modo preview:</strong> este formulário é apenas visual. Nenhuma chamada será feita.</div>}
          <div className="field"><label htmlFor="script">Trote</label><select id="script" className="select" value={scriptId} onChange={(e) => setScriptId(e.target.value)}>{scripts.map((script) => <option key={script.id} value={script.id}>{script.title} · {script.creditCost} créditos</option>)}</select></div>
          <div className="field"><label htmlFor="phone">Telefone do destinatário</label><input id="phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+5511999999999" required /><span className="muted">Use país + DDD + número. Exemplo: +5511999999999.</span></div>
          <div className="field"><label htmlFor="label">Apelido interno opcional</label><input id="label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="Ex.: amigo do trabalho" /></div>
          <label className="checkbox-row"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>Confirmo que tenho autorização legítima para contatar este destinatário e não usarei o serviço para ameaça, perseguição, fraude ou assédio.</span></label>
          <label className="checkbox-row"><input type="checkbox" checked={recording} onChange={(e) => setRecording(e.target.checked)} /><span>Confirmo que eventual gravação foi previamente autorizada pelas pessoas envolvidas. A gravação também precisa estar habilitada no servidor.</span></label>
          <div className="notice">Números de emergência, destinos bloqueados e padrões de abuso são recusados automaticamente.</div>
          {error && <div className="error-box">{error}</div>}{success && <div className="success-box">{success}</div>}
          <button className="button" disabled={busy || !consent || !scriptId}>{busy ? 'Preparando…' : isPreviewMode ? 'Simular trote' : 'Confirmar e iniciar'}</button>
        </section>

        <aside className="card summary-card">
          <span className="eyebrow">Dentro da caixa</span><h2>{selected?.title ?? 'Selecione um trote'}</h2><p className="muted">{selected?.description}</p>
          <div className="summary-line"><span>Duração estimada</span><strong>{selected ? `${selected.durationSeconds}s` : '—'}</strong></div>
          <div className="summary-line"><span>Custo</span><strong>{selected ? `${selected.creditCost} créditos` : '—'}</strong></div>
          <div className="summary-line"><span>Telefonia</span><strong>{isPreviewMode ? 'Simulada' : 'Servidor próprio'}</strong></div>
        </aside>
      </form>
    </AppShell>
  );
}
