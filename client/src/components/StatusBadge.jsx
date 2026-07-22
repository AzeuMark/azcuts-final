import cn from '../utils/cn';
import { STATUS_META } from '../utils/constants';

// Appointment lifecycle pill. Carries a text label (never color-only) plus a dot.
export default function StatusBadge({ status, className }) {
  const meta =
    STATUS_META[status] || {
      label: status || 'Unknown',
      classes: 'bg-surface-2 text-muted ring-1 ring-inset ring-line',
    };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        meta.classes,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
