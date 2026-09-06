'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Brand } from './Brand';
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
        <Brand />
        {isPreviewMode && <div className="preview-badge">Preview local</div>}
        <nav className="sidebar-nav" aria-label="Navegação principal">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={`sidebar-link ${item.active ? 'active' : ''}`}>
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
          <Link href="/wallet/" className="credit-chip"><span>Créditos</span><strong>{balance ?? '—'}</strong></Link>
        </header>
        {children}
      </main>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        {nav.slice(0, 5).map((item) => <Link key={item.href} className={item.active ? 'active' : ''} href={item.href}><span>{item.icon}</span><span>{item.label.split(' ')[0]}</span></Link>)}
      </nav>
    </div>
  );
}
