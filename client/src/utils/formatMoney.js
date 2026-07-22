import { DEFAULT_CURRENCY } from './constants';

// Money is computed and sent by the server; the client only formats it for display.
export function formatMoney(amount, currency = DEFAULT_CURRENCY, locale = 'en-PH') {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

// Compact form for KPI cards (e.g. ₱12.3k). Falls back to full format on small values.
export function formatMoneyCompact(amount, currency = DEFAULT_CURRENCY, locale = 'en-PH') {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) < 10000) return formatMoney(value, currency, locale);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return formatMoney(value, currency, locale);
  }
}
