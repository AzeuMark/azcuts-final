// Client-side mirror of the server enums (SERVER_PLAN §3). The server remains the
// source of truth; these keep the UI in lockstep and give one place to change labels.

export const ROLES = { USER: 'user', STAFF: 'staff', ADMIN: 'admin' };

export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
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

// Appointment status → label + tint classes for StatusBadge. Never color-only:
// every badge carries a text label (accessibility, PRODUCT.md).
export const STATUS_META = {
  pending: { label: 'Pending', classes: 'bg-warning/10 text-warning ring-1 ring-inset ring-warning/25' },
  accepted: { label: 'Accepted', classes: 'bg-info/10 text-info ring-1 ring-inset ring-info/25' },
  in_service: { label: 'In service', classes: 'bg-brand/10 text-brand ring-1 ring-inset ring-brand/25' },
  done: { label: 'Done', classes: 'bg-success/10 text-success ring-1 ring-inset ring-success/25' },
  cancelled: { label: 'Cancelled', classes: 'bg-danger/10 text-danger ring-1 ring-inset ring-danger/25' },
};

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
