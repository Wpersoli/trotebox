'use client';

import { FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import type { ScriptSummary } from '@trotebox/contracts';
import { AppShell } from '@/components/AppShell';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { ApiError, api, isPreviewMode } from '@/lib/api';

export default function NewCallPage() {
  const { user } = useAuth();
  const [pendingKey, setPendingKey] = useState('');
  const storageKey = user ? `trotebox:call-intent:${user.id}` : '';
  useEffect(() => {
    if (!storageKey || isPreviewMode) return;
    const timer = window.setTimeout(() => {
      try { setPendingKey(sessionStorage.getItem(storageKey) ?? ''); } catch { /* Current page remains usable. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);
  const [scripts, setScripts] = useState<ScriptSummary[]>([]);
  const [scriptId, setScriptId] = useState('');
  const [phone, setPhone] = useState('+55');
  const [label, setLabel] = useState('');
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [outboundCallsAvailable, setOutboundCallsAvailable] = useState(isPreviewMode);
  const [twilioTrialMode, setTwilioTrialMode] = useState(false);
  const [recordingAvailable, setRecordingAvailable] = useState(isPreviewMode);
  const [loadingScripts, setLoadingScripts] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    let active = true;
    const requestedScript = new URLSearchParams(window.location.search).get('script') ?? '';
    api.catalog()
      .then((data) => {
        if (!active) return;
        setScripts(data.scripts);
        setOutboundCallsAvailable(data.capabilities.outboundCalls);
        setTwilioTrialMode(data.capabilities.twilioTrial === true);
        setRecordingAvailable(data.capabilities.recordingAvailable === true);
        if (!data.capabilities.recordingAvailable) setRecording(false);
        const exists = data.scripts.some((item) => item.id === requestedScript);
        setScriptId(exists ? requestedScript : (data.scripts[0]?.id ?? ''));
      })
      .catch(() => { if (active) setCatalogError('Não foi possível carregar os roteiros. Atualize a página para tentar novamente.'); })
      .finally(() => { if (active) setLoadingScripts(false); });
    return () => { active = false; };
  }, []);
  const selected = useMemo(() => scripts.find((item) => item.id === scriptId), [scripts, scriptId]);
  const submitLockRef = useRef(false);
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  function clearIntent() {
    setPendingKey('');
    idempotencyRef.current = null;
    try { if (storageKey) sessionStorage.removeItem(storageKey); } catch { /* Best effort. */ }
  }

  async function recoverIntent() {
    if (submitLockRef.current || !pendingKey) return;
    submitLockRef.current = true;
    setBusy(true);
    setError('');
    try {
      const data = await api.recoverCall(pendingKey);
      if (data.recoveryKey !== pendingKey) throw new Error('A consulta segura ainda não está disponível. Mantenha esta solicitação e tente novamente mais tarde.');
      const call = data.calls[0];
      if (!call) {
        setError('A solicitação ainda não foi localizada. Aguarde e consulte novamente; não inicie outra ligação enquanto a confirmação estiver pendente.');
        return;
      }
      clearIntent();
      setPhone('+55');
      setConsent(false);
      setSuccess('Solicitação localizada. Acompanhe o andamento no histórico.');
      window.dispatchEvent(new Event('trotebox:wallet-updated'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar a chamada.');
    } finally { submitLockRef.current = false; setBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (submitLockRef.current || pendingKey) return;

    setError('');
    setSuccess('');

    const recipientPhone = phone.replace(/[\s()-]/g, '');
    const recipientLabel = label.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(recipientPhone)) {
      setError('Informe o telefone no formato internacional E.164, por exemplo +5511999999999.');
      return;
    }
    if (recipientLabel && recipientLabel.length < 2) {
      setError('O apelido interno precisa ter pelo menos 2 caracteres ou ficar vazio.');
      return;
    }

    submitLockRef.current = true;
    setBusy(true);
    const payload = {
      scriptId,
      recipientPhone,
      recipientLabel: recipientLabel || undefined,
      consentConfirmed: consent,
      recordingConsentConfirmed: recording
    };

    const fingerprint = JSON.stringify(payload);
    const previousAttempt = idempotencyRef.current;

    const attempt =
      previousAttempt?.fingerprint === fingerprint
        ? previousAttempt
        : {
            fingerprint,
            key: crypto.randomUUID()
          };

    idempotencyRef.current = attempt;
    if (!isPreviewMode) {
      setPendingKey(attempt.key);
      try { if (storageKey) sessionStorage.setItem(storageKey, attempt.key); } catch { /* Never store the recipient number. */ }
    }

    try {
      const result = await api.createCall({
        ...payload,
        idempotencyKey: attempt.key
      });

      clearIntent();
      setPhone('+55');
      setConsent(false);
      window.dispatchEvent(new Event('trotebox:wallet-updated'));

      setSuccess(
        isPreviewMode
          ? `Simulação criada com sucesso: ${String(result.call.scriptTitle ?? 'Trote')}. Nenhuma ligação real foi realizada.`
          : `Trote criado com sucesso. Identificador: ${String(result.call.id)}`
      );
    } catch (cause) {
      const uncertainResult =
        cause instanceof ApiError &&
        (
          cause.code === 'REQUEST_TIMEOUT' ||
          cause.code === 'NETWORK_ERROR' || cause.code === 'CALL_RECONCILIATION_PENDING' || cause.status >= 500
        );

      if (!uncertainResult) {
        clearIntent();
      }

      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível criar o trote.'
      );
    } finally {
      submitLockRef.current = false;
      setBusy(false);
    }
  }

  return (
    <AppShell title="Novo trote">
      <form className="form-grid" onSubmit={submit} aria-busy={busy || loadingScripts}>
        <section className="card form-panel form-stack">
          {pendingKey && <div className="notice" role="status"><strong>Uma chamada aguarda confirmação.</strong><p>Consulte a solicitação antes de iniciar outra. O número do destinatário não é salvo neste navegador.</p><button type="button" className="button secondary" disabled={busy} onClick={() => void recoverIntent()}>Consultar solicitação</button></div>}
          {catalogError && <div className="error-box" role="alert">{catalogError}</div>}
          {loadingScripts && <div className="notice" role="status">Carregando roteiros…</div>}
          {isPreviewMode && <div className="notice"><strong>Modo preview:</strong> este formulário é apenas visual. Nenhuma chamada será feita.</div>}
          {!isPreviewMode && twilioTrialMode && <div className="notice"><strong>Teste Twilio Trial:</strong> a conta de teste reproduz somente a saudação modelo da Twilio. O roteiro do TroteBox e a gravação ficam disponíveis após o upgrade da conta e a habilitação da gravação.</div>}
          {!isPreviewMode && !outboundCallsAvailable && <div className="notice"><strong>Telefonia em configuração:</strong> você pode consultar o catálogo, mas nenhuma chamada real será iniciada até a integração estar disponível.</div>}
          <div className="field"><label htmlFor="script">Trote</label><select id="script" className="select" value={scriptId} onChange={(e) => setScriptId(e.target.value)} disabled={loadingScripts || !scripts.length}>{scripts.map((script) => <option key={script.id} value={script.id}>{script.title} · {script.creditCost} créditos</option>)}</select></div>
          <div className="field"><label htmlFor="phone">Telefone do destinatário</label><input id="phone" className="input" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+5511999999999" maxLength={16} required /><span className="muted">Use país + DDD + número. Exemplo: +5511999999999.</span></div>
          <div className="field"><label htmlFor="label">Apelido interno opcional</label><input id="label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} minLength={2} maxLength={80} placeholder="Ex.: amigo do trabalho" /></div>
          <label className="checkbox-row"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>Confirmo que tenho autorização legítima para contatar este destinatário e não usarei o serviço para ameaça, perseguição, fraude ou assédio.</span></label>
          <label className="checkbox-row"><input type="checkbox" checked={recording} onChange={(e) => setRecording(e.target.checked)} disabled={busy || !recordingAvailable} /><span>Confirmo que eventual gravação foi previamente autorizada pelas pessoas envolvidas. A gravação também precisa estar habilitada no servidor.{!recordingAvailable && ' Indisponível no ambiente atual.'}</span></label>
          <div className="notice">Números de emergência, destinos bloqueados e padrões de abuso são recusados automaticamente.</div>
          {error && <div className="error-box" role="alert">{error}</div>}{success && <div className="success-box" role="status">{success} <Link href="/calls/">Abrir histórico</Link></div>}
          <button className="button" disabled={busy || Boolean(pendingKey) || loadingScripts || !scripts.length || !consent || !scriptId || !outboundCallsAvailable}>{busy ? 'Preparando…' : isPreviewMode ? 'Simular trote' : twilioTrialMode ? 'Iniciar teste Twilio' : outboundCallsAvailable ? 'Confirmar e iniciar' : 'Telefonia indisponível'}</button>
        </section>

        <aside className="card summary-card">
          <span className="eyebrow">Dentro da caixa</span><h2>{selected?.title ?? 'Selecione um trote'}</h2><p className="muted">{selected?.description}</p>
          <div className="summary-line"><span>Duração estimada</span><strong>{selected ? `${selected.durationSeconds}s` : '—'}</strong></div>
          <div className="summary-line"><span>Custo</span><strong>{selected ? `${selected.creditCost} créditos` : '—'}</strong></div>
          <div className="summary-line"><span>Telefonia</span><strong>{isPreviewMode ? 'Simulada' : twilioTrialMode ? 'Teste Twilio' : outboundCallsAvailable ? 'Disponível' : 'Em configuração'}</strong></div>
        </aside>
      </form>
    </AppShell>
  );
}
