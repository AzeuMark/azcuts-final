import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import authApi from '../api/auth.api';
import { setAccessToken, onAuthFailure } from '../config/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'guest'
  const bootstrapped = useRef(false);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  // data = { user, accessToken } from login/register
  const applySession = useCallback((data) => {
    if (data?.accessToken) setAccessToken(data.accessToken);
    if (data?.user) setUser(data.user);
    setStatus('authenticated');
  }, []);

  const login = useCallback(
    async (email, password) => {
      const res = await authApi.login({ email, password });
      applySession(res.data);
      return res.data?.user;
    },
    [applySession]
  );

  const register = useCallback(
    async (payload) => {
      const res = await authApi.register(payload);
      applySession(res.data);
      return res.data?.user;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* even if the network call fails, drop local session */
    }
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const res = await authApi.me();
    const next = res?.data?.user ?? null;
    if (next) setUser(next);
    return next;
  }, []);

  // Silent refresh on app load: httpOnly cookie → access token → profile.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      try {
        const res = await authApi.refresh(); // { data: { accessToken } }
        const token = res?.data?.accessToken;
        if (!token) throw new Error('No access token');
        setAccessToken(token);
        const me = await authApi.me();
        setUser(me?.data?.user ?? null);
        setStatus('authenticated');
      } catch {
        clearSession();
      }
    })();
  }, [clearSession]);

  // Axios triggers this when a mid-session silent refresh fails.
  useEffect(() => onAuthFailure(clearSession), [clearSession]);

  const value = useMemo(
    () => ({
      user,
      status,
      role: user?.role ?? null,
      isAuthenticated: status === 'authenticated' && !!user,
      isLoading: status === 'loading',
      login,
      register,
      logout,
      refreshUser,
      setUser,
    }),
    [user, status, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
