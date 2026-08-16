'use client';

import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/components/AuthProvider';
import { isPreviewMode } from '@/lib/api';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  return (
    <AppShell title="Configurações">
      <section className="card form-panel form-stack" style={{ maxWidth: 760 }}>
        <div><span className="eyebrow">Seu espaço TroteBox</span><h2>Acesso protegido por e-mail</h2><p className="muted">{user?.email}</p></div>
        {isPreviewMode && <div className="notice">Você está no modo de demonstração local. Banco de dados, telefonia e pagamentos reais permanecem desligados.</div>}
        <div className="settings-list">
          <div><strong>Privacidade</strong><span>Dados sensíveis e segredos ficam fora do frontend.</span></div>
          <div><strong>Uso responsável</strong><span>Bloqueios, limites e consentimentos fazem parte do fluxo de produção.</span></div>
          <div><strong>Identidade</strong><span>TroteBox · Riso na linha. Surpresa na caixa.</span></div>
        </div>
        <button className="button danger" onClick={logout}>Encerrar sessão</button>
      </section>
    </AppShell>
  );
}
