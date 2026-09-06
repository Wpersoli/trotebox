'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { useEffect, useState } from 'react';
import { api, isPreviewMode } from '@/lib/api';

const links = [
  { href: '/dashboard/', label: 'Visão geral', icon: '⌂' },
  { href: '/catalog/', label: 'Trotes', icon: '◈' },
  { href: '/calls/new/', label: 'Novo trote', icon: '✦' },
  { href: '/calls/', label: 'Histórico', icon: '↺' },
  { href: '/wallet/', label: 'Créditos', icon: '◇' },
  { href: '/settings/', label: 'Configurações', icon: '⚙' }
];

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (ready && !user) router.replace('/#acesso');
    let active = true;
    const refresh = () => {
      if (user) void api.wallet().then((data) => { if (active) setBalance(data.balanceCredits); }).catch(() => undefined);
    };
    refresh();
    window.addEventListener('trotebox:wallet-updated', refresh);
    return () => { active = false; window.removeEventListener('trotebox:wallet-updated', refresh); };
  }, [ready, user, router]);

  if (!ready || !user) return null;

  const nav = links.map((item) => ({ ...item, active: pathname === item.href || pathname.startsWith(item.href.replace(/\/$/, '') + '/') }));

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link href="/" className="app-brand" aria-label="TroteBox — página inicial">
          <span className="app-brand-mark" aria-hidden="true">TB</span>
          <span className="app-brand-copy"><strong>Trote<span>Box</span></strong><small>Central de trotes</small></span>
        </Link>
        {isPreviewMode && <div className="preview-badge">Preview local</div>}
        <nav className="sidebar-nav" aria-label="Navegação principal">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={`sidebar-link ${item.active ? 'active' : ''}`} aria-current={item.active ? 'page' : undefined}>
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="button ghost" style={{ width: '100%' }} onClick={() => void logout()}>Sair da conta</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><span className="eyebrow">TroteBox</span><h1>{title}</h1></div>
          <Link href="/wallet/" className="credit-chip" aria-label={`Abrir créditos. Saldo atual: ${balance ?? 'indisponível'}`}>
            <span className="credit-chip-icon" aria-hidden="true">◈</span>
            <span className="credit-chip-label">Saldo</span>
            <strong>{balance ?? '—'}</strong>
            <small>créditos</small>
          </Link>
        </header>
        {children}
      </main>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        {nav.slice(0, 5).map((item) => <Link key={item.href} className={item.active ? 'active' : ''} href={item.href}><span>{item.icon}</span><span>{item.label.split(' ')[0]}</span></Link>)}
      </nav>
    </div>
  );
}
