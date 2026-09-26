import cn from '../utils/cn';
import { STATUS_META, DEFAULT_ROLE_COLORS, pillStyle } from '../utils/constants';
import { useBranding } from '../hooks/useSettingsPublic';

// Appointment lifecycle pill. Tint comes from the editable branding colors
// (configuration.json); carries a text label, never color-only, plus a dot.
export default function StatusBadge({ status, className }) {
  const { statuses } = useBranding();
  const meta = STATUS_META[status] || { label: status || 'Unknown' };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        className
      )}
      style={pillStyle(statuses[status] || DEFAULT_ROLE_COLORS.user)}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
