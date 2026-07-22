import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import authApi from '../api/auth.api';
import { setAccessToken, onAuthFailure } from '../config/axios';

const AuthContext = createContext(null);

// Local hint that a session likely exists (the real refresh token is an httpOnly
// cookie we can't read). Lets guests skip the silent /auth/refresh call — which
// would otherwise log a harmless 401 in the console on every landing visit.
const SESSION_HINT = 'az-has-session';
const readSessionHint = () => {
  try {
    return localStorage.getItem(SESSION_HINT) === '1';
  } catch {
    return false;
  }
};
const setSessionHint = (on) => {
  try {
    if (on) localStorage.setItem(SESSION_HINT, '1');
    else localStorage.removeItem(SESSION_HINT);
  } catch {
    /* storage unavailable — non-fatal */
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'guest'
  const bootstrapped = useRef(false);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('guest');
    setSessionHint(false);
  }, []);

  // data = { user, accessToken } from login/register
  const applySession = useCallback((data) => {
    if (data?.accessToken) setAccessToken(data.accessToken);
    if (data?.user) setUser(data.user);
    setStatus('authenticated');
    setSessionHint(true);
  }, []);

  // identifier may be a username or an email
  const login = useCallback(
    async (identifier, password) => {
      const res = await authApi.login({ identifier, password });
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
  // Skipped entirely for visitors with no prior session, so a fresh guest never
  // fires /auth/refresh (avoids the 401 noise in the console).
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    if (!readSessionHint()) {
      setStatus('guest');
      return;
    }
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
