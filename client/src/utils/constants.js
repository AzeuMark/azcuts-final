// Client-side mirror of the server enums (SERVER_PLAN §3). The server remains the
// source of truth; these keep the UI in lockstep and give one place to change labels.

export const ROLES = { USER: 'user', STAFF: 'staff', ADMIN: 'admin' };

export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  SELECTED: 'selected',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  IN_SERVICE: 'in_service',
  DONE: 'done',
  CANCELLED: 'cancelled',
};

export const PAYMENT_METHODS = { CASH: 'cash', GCASH: 'gcash' };
export const PAYMENT_STATUS = { UNPAID: 'unpaid', PAID: 'paid' };
export const SYSTEM_MODES = { ONLINE: 'online', MAINTENANCE: 'maintenance', OFFLINE: 'offline' };
export const SERVICE_CATEGORIES = { HAIRCUT: 'haircut', SALON: 'salon' };
export const USER_STATUS = { ACTIVE: 'active', INACTIVE: 'inactive', IN_SERVICE: 'in_service' };

// Appointment status → label for StatusBadge. The tint comes from the editable
// branding colors (see below), never color-only: every badge carries text.
export const STATUS_META = {
  pending: { label: 'Pending' },
  selected: { label: 'Selected' },
  assigned: { label: 'Assigned' },
  accepted: { label: 'Accepted' },
  in_service: { label: 'In service' },
  done: { label: 'Done' },
  cancelled: { label: 'Cancelled' },
};

// Editable pill colors — root configuration.json -> colors, served via
// GET /settings/public. These defaults preserve the shipped look whenever a
// key is missing or not a valid hex color.
export const DEFAULT_STATUS_COLORS = {
  pending: '#D97706',
  selected: '#0EA5E9',
  assigned: '#8B5CF6',
  accepted: '#2563EB',
  in_service: '#E11D48',
  done: '#16A34A',
  cancelled: '#DC2626',
};

export const DEFAULT_ROLE_COLORS = {
  admin: '#E11D48',
  staff: '#2563EB',
  user: '#74726C',
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// Accept #rgb or #rrggbb (normalized to #RRGGBB); anything else → fallback.
export function normalizeHex(value, fallback) {
  if (typeof value !== 'string' || !HEX_RE.test(value.trim())) return fallback;
  let hex = value.trim();
  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex.toUpperCase();
}

export function resolveColorMap(configMap, defaults) {
  const out = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    out[key] = normalizeHex(configMap?.[key], fallback);
  }
  return out;
}

// Pill (badge) inline style from a hex color: tinted bg + colored text + ring.
export function pillStyle(hex) {
  return {
    backgroundColor: `${hex}1A`,
    color: hex,
    border: `1px solid ${hex}40`,
  };
}

// Payment method presentation. GCash is shown but disabled (locked decision).
export const PAYMENT_METHOD_META = {
  cash: { label: 'Cash', enabled: true, note: 'Pay at the shop' },
  gcash: { label: 'GCash', enabled: false, note: 'Coming soon' },
};

// Where each role lands after auth (CLIENT_PLAN §2.1).
export const ROLE_HOME = {
  user: '/app/book',
  staff: '/staff/dashboard',
  admin: '/admin/dashboard',
};

export const DEFAULT_TIMEZONE = 'Asia/Manila';
export const DEFAULT_CURRENCY = 'PHP';

// Analytics range filters (admin).
export const ANALYTICS_RANGES = ['daily', 'weekly', 'monthly', 'yearly', 'all'];
