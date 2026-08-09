'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, isPreviewMode } from '@/lib/api';

type User = { id: string; email: string; displayName: string };
type AuthContextValue = {
  user: User | null;
  ready: boolean;
  loginDemo: (email: string, displayName: string) => Promise<void>;
  loginWithCode: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const PREVIEW_USER_KEY = 'trotebox_preview_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        if (isPreviewMode) {
          const raw = localStorage.getItem(PREVIEW_USER_KEY);
          if (raw && active) setUser(JSON.parse(raw) as User);
          return;
        }
        const result = await api.session();
        if (active) setUser(result.user);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setReady(true);
      }
    }
    void restore();
    return () => { active = false; };
  }, []);

  const acceptSession = useCallback((result: { user: User }) => {
    if (isPreviewMode) localStorage.setItem(PREVIEW_USER_KEY, JSON.stringify(result.user));
    setUser(result.user);
  }, []);

  const loginDemo = useCallback(async (email: string, displayName: string) => {
    acceptSession(await api.devLogin(email, displayName));
  }, [acceptSession]);

  const loginWithCode = useCallback(async (email: string, code: string) => {
    acceptSession(await api.verifyAuthCode(email, code));
  }, [acceptSession]);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* sessão local será encerrada de qualquer forma */ }
    localStorage.removeItem(PREVIEW_USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, loginDemo, loginWithCode, logout }), [user, ready, loginDemo, loginWithCode, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return value;
}
