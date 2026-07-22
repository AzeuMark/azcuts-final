import cn from '../utils/cn';
import Skeleton from './ui/Skeleton';

const TONES = {
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  accent: 'bg-accent/10 text-accent',
};

export default function StatCard({ label, value, icon: Icon, tone = 'brand', hint, loading = false }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{label}</p>
        {Icon && (
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', TONES[tone] || TONES.brand)}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p className="mt-3 text-2xl font-semibold text-ink tnum">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
