'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import './HomeAccess.css';
import { Brand } from './Brand';
import { useAuth } from './AuthProvider';
import { api, isPreviewMode } from '@/lib/api';

const authMode = process.env.NEXT_PUBLIC_AUTH_MODE ?? 'passwordless';
const OTP_RESEND_COOLDOWN_SECONDS = 60;

function maskEmail(value: string) {
  const [local, domain] = value.split('@');
  if (!local || !domain) return value;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export function HomeAccess() {
  const router = useRouter();
  const { user, ready, loginDemo, loginWithCode } = useAuth();
  const [email, setEmail] = useState(isPreviewMode ? 'demo@trotebox.local' : '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'identity' | 'code'>('identity');
  const [developmentCode, setDevelopmentCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 'code' || resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [step, resendIn]);

  useEffect(() => {
    if (step === 'code') codeInputRef.current?.focus();
  }, [step]);

  const maskedEmail = useMemo(() => maskEmail(email), [email]);

  async function sendCode() {
    setBusy(true);
    setError('');
    try {
      if (authMode === 'dev' && !isPreviewMode) {
        await loginDemo(email, 'Conta Demonstração');
        router.push('/dashboard/');
        return;
      }
      const result = await api.requestAuthCode(email);
      setDevelopmentCode(result.devCode ?? '');
      setStep('code');
      setCode('');
      setResendIn(OTP_RESEND_COOLDOWN_SECONDS);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar o código.');
    } finally {
      setBusy(false);
    }
  }

  async function submitIdentity(event: FormEvent) {
    event.preventDefault();
    await sendCode();
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await loginWithCode(email, code);
      router.push('/dashboard/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Código inválido ou expirado.');
    } finally {
      setBusy(false);
    }
  }

  function changeEmail() {
    setStep('identity');
    setCode('');
    setDevelopmentCode('');
    setError('');
    setResendIn(0);
  }

  const accessChrome = (
    <>
      <div className="access-hero-mascot" aria-hidden="true">
        <Image src="/brand/trotebox-mascot.webp" alt="" width={160} height={160} sizes="(max-width: 680px) 68px, 92px" />
      </div>
      <span className="access-card-kicker">ACESSO SEGURO · SEM SENHA</span>
      <Brand />
    </>
  );

  const accessContent = ready && user ? (
    <section className="card access-card access-card-authenticated" aria-labelledby="access-title">
      {accessChrome}
      <span className="access-kicker">Área exclusiva</span>
      <h1 id="access-title">Seu acesso está ativo</h1>
      <p>Você já confirmou este e-mail nesta sessão.</p>
      <button className="button access-primary" onClick={() => router.push('/dashboard/')}>Entrar no meu espaço</button>
    </section>
  ) : (
    <section className="card access-card" aria-labelledby="access-title">
      {accessChrome}
      {isPreviewMode && <div className="preview-badge inline">Preview local</div>}
      <h1 id="access-title">{step === 'identity' ? 'Entre na TroteBox' : 'Confirme seu acesso'}</h1>
      <p>
        {step === 'identity'
          ? 'Informe o e-mail que identifica o seu espaço exclusivo. A cada nova sessão, enviaremos um código temporário de seis dígitos. Nenhuma senha é armazenada.'
          : <>Enviamos um código para <strong>{maskedEmail}</strong>. Ele é de uso único e expira em poucos minutos.</>}
      </p>

      {step === 'identity' ? (
        <form className="form-stack access-form" onSubmit={submitIdentity} noValidate>
          <div className="field">
            <label htmlFor="access-email">E-mail</label>
            <input
              id="access-email"
              className="input access-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value.trim())}
              placeholder="voce@exemplo.com"
              required
              aria-describedby="access-email-help"
            />
            <small id="access-email-help" className="field-help">Seus créditos e histórico ficam vinculados a este e-mail.</small>
          </div>
          {error && <div className="error-box" role="alert">{error}</div>}
          <button className="button access-primary" disabled={busy || !email.includes('@')}>
            {busy ? 'Enviando…' : authMode === 'dev' && !isPreviewMode ? 'Abrir demonstração' : 'Enviar código'}
          </button>
          <div className="access-security-note"><span aria-hidden="true">✓</span> Código de uso único · sessão protegida · sem senha</div>
        </form>
      ) : (
        <form className="form-stack access-form" onSubmit={submitCode}>
          {developmentCode && <div className="notice"><strong>Preview:</strong> use o código {developmentCode}.</div>}
          <div className="field">
            <label htmlFor="access-code">Código de seis dígitos</label>
            <input
              ref={codeInputRef}
              id="access-code"
              className="input access-input access-code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              required
            />
          </div>
          {error && <div className="error-box" role="alert">{error}</div>}
          <button className="button access-primary" disabled={busy || code.length !== 6}>{busy ? 'Validando…' : 'Confirmar e entrar'}</button>
          <div className="access-secondary-actions">
            <button type="button" className="text-button" onClick={changeEmail}>Corrigir e-mail</button>
            <button type="button" className="text-button" disabled={busy || resendIn > 0} onClick={() => void sendCode()}>
              {resendIn > 0 ? `Reenviar em ${resendIn}s` : 'Reenviar código'}
            </button>
          </div>
        </form>
      )}
    </section>
  );

  return accessContent;
}
