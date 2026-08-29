import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService, setSession } from '../services/apiService';

const STORAGE_KEY = 'auth_session';

type Session = { token: string; email: string; role: string } | null;

type AuthContextValue = {
  token: string | null;
  email: string | null;
  role: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bridge to apiService's axios interceptor, which can't call useAuth()
  // itself since it's a plain module, not a component.
  useEffect(() => {
    setSession(session ? { token: session.token, email: session.email } : null);
  }, [session]);

  // One-time bootstrap: read a stored session and confirm the token is
  // still valid before deciding whether to show the tabs or the login
  // screen. Stack.Protected only mounts once this resolves (see
  // app/_layout.tsx), so there's no flash of protected UI.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setIsLoading(false);
          return;
        }
        const stored: Session = JSON.parse(raw);
        setSession(stored ? { token: stored.token, email: stored.email } : null);
        const me = await apiService.getMe();
        setSessionState({ token: stored!.token, email: me.email, role: me.role });
      } catch (error) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setSessionState(null);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await apiService.login(email, password);
    const next: Session = { token: result.token, email: result.email, role: result.role };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSessionState(next);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSessionState(null);
  };

  const value: AuthContextValue = {
    token: session?.token ?? null,
    email: session?.email ?? null,
    role: session?.role ?? null,
    isLoading,
    isAuthenticated: !!session?.token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
