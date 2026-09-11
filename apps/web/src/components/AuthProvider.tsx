'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, isPreviewMode } from '@/lib/api';

type User = { id: string; email: string; displayName: string };
type AuthContextValue = {
  user: User | null;
  ready: boolean;
  logoutError: string;
  loginDemo: (email: string, displayName: string) => Promise<void>;
  loginWithCode: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const PREVIEW_USER_KEY = 'trotebox_preview_user';

function isPreviewUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<User>;
  return [candidate.id, candidate.email, candidate.displayName].every(
    (field) => typeof field === 'string' && field.length > 0 && field.length <= 256
  );
}

export function parsePreviewUser(raw: string | null): User | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isPreviewUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readPreviewUser() {
  try {
    return parsePreviewUser(window.localStorage.getItem(PREVIEW_USER_KEY));
  } catch {
    // Private browsing and restrictive WebViews can deny storage access.
    return null;
  }
}

function writePreviewUser(user: User) {
  try {
    window.localStorage.setItem(PREVIEW_USER_KEY, JSON.stringify(user));
  } catch {
    // Preview remains usable for the current session even without storage.
  }
}

function clearPreviewUser() {
  try {
    window.localStorage.removeItem(PREVIEW_USER_KEY);
  } catch {
    // Storage may be unavailable; React state is still cleared below.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        if (isPreviewMode) {
          const storedUser = readPreviewUser();
          if (storedUser && active) setUser(storedUser);
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
    if (isPreviewMode) writePreviewUser(result.user);
    setUser(result.user);
  }, []);

  const loginDemo = useCallback(async (email: string, displayName: string) => {
    acceptSession(await api.devLogin(email, displayName));
  }, [acceptSession]);

  const loginWithCode = useCallback(async (email: string, code: string) => {
    acceptSession(await api.verifyAuthCode(email, code));
  }, [acceptSession]);

  const logout = useCallback(async () => {
    setLogoutError('');
    try { await api.logout(); } catch { setLogoutError('Não foi possível confirmar a saída. Verifique a conexão e tente encerrar a sessão novamente.'); return; }
    if (isPreviewMode) clearPreviewUser();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, logoutError, loginDemo, loginWithCode, logout }), [user, ready, logoutError, loginDemo, loginWithCode, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return value;
}
