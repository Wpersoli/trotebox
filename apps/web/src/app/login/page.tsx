'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/components/Brand';
import { useAuth } from '@/components/AuthProvider';
import { api, isPreviewMode } from '@/lib/api';

const authMode = process.env.NEXT_PUBLIC_AUTH_MODE ?? 'passwordless';

export default function LoginPage() {
  const router = useRouter();
  const { loginDemo, loginWithCode } = useAuth();
  const [email, setEmail] = useState(authMode === 'dev' || isPreviewMode ? 'demo@trotebox.local' : '');
  const [name, setName] = useState(authMode === 'dev' || isPreviewMode ? 'Conta Demonstração' : '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'identity' | 'code'>('identity');
  const [developmentCode, setDevelopmentCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submitIdentity(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (authMode === 'dev' || isPreviewMode) {
        await loginDemo(email, name);
        router.push('/dashboard/');
        return;
      }
      const result = await api.requestAuthCode(email, name);
      setDevelopmentCode(result.devCode ?? '');
      setStep('code');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar o código.');
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await loginWithCode(email, code);
      router.push('/dashboard/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Código inválido.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-visual" aria-hidden="true"><Image src="/brand/trotebox-hero.webp" alt="" width={1500} height={844} sizes="(max-width: 1100px) 0px, 58vw" priority /></div>
      <section className="card auth-card">
        <Brand />
        {isPreviewMode && <div className="preview-badge inline">Preview local — sem banco ou API</div>}
        <h1>{step === 'identity' ? 'Entre na TroteBox' : 'Confirmar código'}</h1>
        <p>{authMode === 'dev' || isPreviewMode ? 'Use a conta demonstração para explorar todo o visual do aplicativo.' : 'Você receberá um código de seis dígitos por e-mail. Nenhuma senha é armazenada.'}</p>

        {step === 'identity' ? (
          <form className="form-stack" onSubmit={submitIdentity}>
            <div className="field"><label htmlFor="name">Nome</label><input id="name" className="input" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} /></div>
            <div className="field"><label htmlFor="email">E-mail</label><input id="email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            {error && <div className="error-box">{error}</div>}
            <button className="button" disabled={busy}>{busy ? 'Abrindo…' : authMode === 'dev' || isPreviewMode ? 'Explorar demonstração' : 'Enviar código'}</button>
          </form>
        ) : (
          <form className="form-stack" onSubmit={submitCode}>
            <div className="notice">Código enviado para {email}.{developmentCode ? ` Código local: ${developmentCode}` : ''}</div>
            <div className="field"><label htmlFor="code">Código de seis dígitos</label><input id="code" className="input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} required /></div>
            {error && <div className="error-box">{error}</div>}
            <button className="button" disabled={busy || code.length !== 6}>{busy ? 'Validando…' : 'Confirmar e entrar'}</button>
            <button type="button" className="button ghost" onClick={() => { setStep('identity'); setCode(''); setError(''); }}>Alterar e-mail</button>
          </form>
        )}
      </section>
    </main>
  );
}
