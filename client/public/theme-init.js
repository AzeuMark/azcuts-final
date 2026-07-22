/*
 * No-flash theme bootstrap. Runs before paint so the correct theme is set on
 * <html> before React mounts. Reads the saved preference (az-theme), falling
 * back to the OS preference on first visit. Mirrors ThemeContext.
 * Kept as an external file (not inline) so it satisfies a strict CSP script-src.
 */
(function () {
  try {
    var stored = localStorage.getItem('az-theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    var root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.colorScheme = theme;
  } catch (e) {
    /* localStorage unavailable — default to light */
  }
})();
