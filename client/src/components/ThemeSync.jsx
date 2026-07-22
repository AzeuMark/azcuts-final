import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import userApi from '../api/user.api';

/*
 * Bridges the (auth-independent) ThemeProvider with the signed-in user's saved
 * preference. Rendered inside both providers so it can read/write both.
 *
 * - On login: if the account has a saved theme, apply it. If it has none yet
 *   ("if not saved yet"), seed the DB with the current local preference.
 * - Afterwards: persist any explicit theme changes back to the account.
 *
 * Guests keep using localStorage only (handled by ThemeProvider).
 */
export default function ThemeSync() {
  const { isAuthenticated, user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const reconciledId = useRef(null);

  const persist = (next, current) => {
    userApi
      .setTheme(next)
      .then((res) => setUser(res?.data?.user || { ...current, theme: next }))
      .catch(() => {
        /* non-fatal: local theme still applies */
      });
  };

  // Reconcile once per authenticated user.
  useEffect(() => {
    if (!isAuthenticated || !user) {
      reconciledId.current = null;
      return;
    }
    const uid = user._id || user.id;
    if (reconciledId.current === uid) return;
    reconciledId.current = uid;

    if (user.theme === 'light' || user.theme === 'dark') {
      if (user.theme !== theme) setTheme(user.theme); // apply saved preference
    } else {
      persist(theme, user); // not saved yet — seed it
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  // Persist later, user-initiated theme switches.
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const uid = user._id || user.id;
    if (reconciledId.current !== uid) return; // wait for the initial reconcile
    if (user.theme === theme) return; // nothing actually changed
    persist(theme, user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return null;
}
