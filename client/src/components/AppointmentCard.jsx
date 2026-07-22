import { Clock, User, Tag } from 'lucide-react';
import cn from '../utils/cn';
import StatusBadge from './StatusBadge';
import { formatMoney } from '../utils/formatMoney';
import { formatDateTime } from '../utils/datetime';

// Compact appointment summary used across staff/admin dashboards. `actions` is an
// optional node (buttons) rendered in the footer.
export default function AppointmentCard({ appointment: a, actions, className }) {
  return (
    <div className={cn('rounded-2xl border border-line bg-surface p-4 shadow-card', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-ink">{a.service?.name || 'Service'}</h3>
            <StatusBadge status={a.status} />
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
            <User className="h-3.5 w-3.5 shrink-0" />
            {a.customer?.fullName || 'Customer'}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {formatDateTime(a.scheduledStart)}
          </p>
          {a.extras?.length > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <Tag className="h-3 w-3 shrink-0" />
              {a.extras.map((e) => e.name).join(', ')}
            </p>
          )}
        </div>
        <span className="shrink-0 font-semibold text-ink tnum">
          {formatMoney(a.priceSnapshot?.total, a.priceSnapshot?.currency)}
        </span>
      </div>
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
