'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
        <Image
          src="/brand/trotebox-mascot.webp"
          alt=""
          width={160}
          height={160}
          sizes="(max-width: 680px) 68px, 92px"
        />
      </div>
      <span className="access-card-kicker">ACESSO SEGURO · SEM SENHA</span>
      <Brand />
    </>
  );

  if (ready && user) {
    return (
      <section className="card access-card access-card-authenticated" aria-labelledby="access-title">
        {accessChrome}
        <span className="access-kicker">Área exclusiva</span>
        <h1 id="access-title">Seu acesso está ativo</h1>
        <p>Você já confirmou este e-mail nesta sessão.</p>
        <button className="button access-primary" onClick={() => router.push('/dashboard/')}>Entrar no meu espaço</button>
        <style jsx global>{`
          .home-access-hero {
            padding: clamp(42px, 6vw, 76px) 0 86px;
            position: relative;
            overflow: clip;
            background:
              radial-gradient(circle at 8% 18%, rgba(255,201,40,.14), transparent 23rem),
              radial-gradient(circle at 94% 12%, rgba(123,76,240,.13), transparent 28rem);
          }
          .home-access-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.12fr) minmax(360px, .88fr);
            align-items: start;
            gap: clamp(26px, 4vw, 56px);
          }
          .home-showcase { min-width: 0; }
          .home-hero-image-wrap {
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(228,224,245,.95);
            border-radius: 32px;
            background: #fff;
            box-shadow: 0 28px 70px rgba(44,11,120,.14);
          }
          .home-hero-image { display: block; width: 100%; height: auto; }
          .home-hero-copy-overlay {
            position: static;
            padding: 17px 20px 19px;
            background: rgba(255,255,255,.98);
            border-top: 1px solid rgba(228,224,245,.95);
            color: var(--muted);
            font-size: .93rem;
            line-height: 1.62;
          }
          .home-showcase-actions {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 11px;
            padding: 18px 4px 11px;
          }
          .compact-button { min-height: 46px; border-radius: 14px; }
          .home-trust-row {
            width: 100%;
            display: flex;
            flex-wrap: wrap;
            gap: 9px;
            margin-top: 2px;
          }
          .home-trust-row span {
            padding: 8px 11px;
            border: 1px solid var(--line);
            border-radius: 999px;
            background: rgba(255,255,255,.86);
            color: #5f5873;
            font-size: .73rem;
            font-weight: 850;
            box-shadow: 0 7px 18px rgba(44,11,120,.05);
          }
          .home-step-grid { gap: 15px; }
          .home-step-card {
            position: relative;
            padding: 22px;
            border-radius: 22px;
            overflow: hidden;
            box-shadow: 0 14px 34px rgba(44,11,120,.07);
            transition: transform .18s ease, box-shadow .18s ease;
          }
          .home-step-card:hover { transform: translateY(-3px); box-shadow: 0 18px 40px rgba(44,11,120,.11); }
          .home-step-card::before {
            content: '';
            display: block;
            width: 42px;
            height: 4px;
            margin-bottom: 16px;
            border-radius: 999px;
            background: var(--purple);
          }
          .home-step-card.orange-step::before { background: var(--orange); }
          .home-step-card.purple-step::before { background: var(--purple-soft); }
          .home-step-card.green-step::before { background: var(--green); }
          .home-access-column { position: sticky; top: 94px; min-width: 0; }
          .home-access-column > .access-card {
            position: relative;
            overflow: visible;
            padding: clamp(28px, 3vw, 36px);
            border: 1px solid rgba(219,212,240,.98);
            border-radius: 30px;
            background: rgba(255,255,255,.96);
            box-shadow: 0 30px 74px rgba(44,11,120,.15);
            backdrop-filter: blur(18px);
          }
          .access-card .brand { margin-bottom: 21px; }
          .access-card-kicker {
            display: inline-flex;
            align-items: center;
            width: fit-content;
            margin-bottom: 9px;
            padding: 7px 10px;
            border: 1px solid rgba(91,33,199,.14);
            border-radius: 999px;
            color: var(--purple);
            background: #faf7ff;
            font-size: .66rem;
            font-weight: 950;
            letter-spacing: .11em;
          }
          .access-card h1 {
            margin-top: 9px;
            font-size: clamp(2rem, 3.1vw, 3rem);
            line-height: 1;
            letter-spacing: -.055em;
          }
          .access-card > p { color: var(--muted); line-height: 1.66; }
          .access-hero-mascot {
            position: absolute;
            top: -28px;
            right: 23px;
            width: 92px;
            height: 92px;
            padding: 6px;
            border-radius: 24px;
            background: linear-gradient(145deg, #fff7cf, #d8c7ff 48%, #ffb3ae);
            box-shadow: 0 18px 34px rgba(44,11,120,.17);
            transform: rotate(4deg);
            z-index: 3;
          }
          .access-hero-mascot::after {
            content: '';
            position: absolute;
            inset: 4px;
            border: 1px solid rgba(255,255,255,.72);
            border-radius: 19px;
            pointer-events: none;
          }
          .access-hero-mascot img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 18px;
          }
          .access-input {
            min-height: 54px;
            padding-inline: 16px;
            border-radius: 16px;
          }
          .access-primary {
            width: 100%;
            min-height: 54px;
            border-radius: 16px;
            background: linear-gradient(135deg, var(--purple) 0%, var(--lilac) 52%, var(--red) 100%);
          }
          .access-security-note {
            margin-top: 4px;
            padding: 12px 14px;
            border: 1px solid #d5ead9;
            border-radius: 14px;
            color: #4a6e58;
            background: #f5fbf6;
            line-height: 1.45;
          }
          .home-access-assurance {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
            margin-top: 12px;
          }
          .home-access-assurance span {
            padding: 8px 11px;
            border: 1px solid var(--line);
            border-radius: 999px;
            color: #625b79;
            background: rgba(255,255,255,.78);
            font-size: .7rem;
            font-weight: 850;
          }
          .home-access-assurance span b { color: var(--purple); }
          @media (max-width: 980px) {
            .home-access-grid { grid-template-columns: 1fr; }
            .home-access-column { position: static; }
            .home-access-column > .access-card { max-width: 680px; margin-inline: auto; }
            .nav-links { gap: 16px; }
            .nav-links a:nth-child(n+4) { display: none; }
          }
          @media (max-width: 680px) {
            .home-access-hero { padding: 28px 0 60px; }
            .home-hero-image-wrap { border-radius: 24px; }
            .home-hero-copy-overlay { padding: 15px 16px 17px; font-size: .88rem; }
            .home-showcase-actions { align-items: stretch; }
            .compact-button { width: 100%; }
            .home-trust-row span { width: 100%; text-align: center; }
            .home-access-column > .access-card { padding: 24px 18px 22px; border-radius: 24px; }
            .access-hero-mascot { width: 68px; height: 68px; top: -18px; right: 14px; border-radius: 18px; }
            .access-hero-mascot img { border-radius: 13px; }
            .access-card-kicker { font-size: .58rem; max-width: calc(100% - 72px); }
          }
          @media (prefers-reduced-motion: reduce) {
            .home-step-card, .button { transition: none !important; }
            .home-step-card:hover, .button:hover { transform: none !important; }
          }
        `}</style>
      </section>
    );
  }

  return (
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
}
