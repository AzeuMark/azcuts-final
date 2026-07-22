import axios from 'axios';

// In production the client is served from the same origin as the API (single
// Heroku app), so default to a relative '/api'. Dev falls back to the local API.
const baseURL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

/*
 * Access token lives in memory only (never localStorage) — the refresh token
 * rides a server-set httpOnly cookie scoped to /api/auth (SERVER_PLAN §6).
 * On a 401 we silently hit /auth/refresh once and replay the original request.
 */
let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token || null;
};
export const getAccessToken = () => accessToken;

// AuthContext subscribes here so it can log the user out when silent refresh fails.
const authFailureHandlers = new Set();
export const onAuthFailure = (handler) => {
  authFailureHandlers.add(handler);
  return () => authFailureHandlers.delete(handler);
};
const emitAuthFailure = () => {
  for (const handler of authFailureHandlers) {
    try {
      handler();
    } catch {
      /* ignore handler errors */
    }
  }
};

const api = axios.create({
  baseURL,
  withCredentials: true, // send/receive the refresh cookie
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Single in-flight refresh shared by all queued 401s.
let refreshPromise = null;

function isAuthRoute(url = '') {
  return (
    url.includes('/auth/refresh') ||
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/logout')
  );
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    if (!response || !config) return Promise.reject(error);

    if (response.status === 401 && !config.__isRetry && !isAuthRoute(config.url)) {
      config.__isRetry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios.post(
            `${baseURL}/auth/refresh`,
            {},
            { withCredentials: true }
          );
        }
        const { data } = await refreshPromise;
        refreshPromise = null;

        const newToken = data?.data?.accessToken ?? data?.accessToken ?? null;
        if (newToken) {
          setAccessToken(newToken);
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${newToken}`;
          return api(config);
        }
      } catch {
        refreshPromise = null;
      }
      // Refresh failed or returned no token → force a clean logout.
      setAccessToken(null);
      emitAuthFailure();
    }

    return Promise.reject(error);
  }
);

// Normalizes an Axios error into a display string (server uses { success, message }).
export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.errors?.[0]?.msg ||
    error?.message ||
    fallback
  );
}

export default api;
