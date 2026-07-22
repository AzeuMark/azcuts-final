import cn from '../utils/cn';
import Skeleton from './ui/Skeleton';

const TONES = {
  brand: 'bg-brand/10 text-brand ring-brand/20',
  success: 'bg-success/10 text-success ring-success/20',
  warning: 'bg-warning/10 text-warning ring-warning/20',
  info: 'bg-info/10 text-info ring-info/20',
  accent: 'bg-accent/10 text-accent ring-accent/20',
};

// Stat tile — icon chip + uppercase label + oversized serif value, with a soft
// hover lift. Used across the admin & staff dashboards.
export default function StatCard({ label, value, icon: Icon, tone = 'brand', hint, loading = false }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        {Icon && (
          <span
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl ring-1',
              TONES[tone] || TONES.brand
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
        {hint && <span className="text-xs font-medium text-muted">{hint}</span>}
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-1.5 h-9 w-24" />
      ) : (
        <p className="mt-1 font-serif text-4xl font-semibold leading-tight text-ink tnum">{value}</p>
      )}
    </div>
  );
}
