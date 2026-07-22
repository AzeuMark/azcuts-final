import { Sparkles, Star, User } from 'lucide-react';
import cn from '../utils/cn';
import Skeleton from './ui/Skeleton';

// value: 'auto' | <staffId>
export default function StaffPicker({ staff = [], value = 'auto', onChange, loading = false }) {
  const optionClasses = (active) =>
    cn(
      'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-ring',
      active ? 'border-brand bg-brand/5' : 'border-line bg-surface hover:bg-surface-2'
    );

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button type="button" onClick={() => onChange?.('auto')} aria-pressed={value === 'auto'} className={optionClasses(value === 'auto')}>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Sparkles className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-medium text-ink">Auto-match</span>
          <span className="block text-xs text-muted">Next available barber</span>
        </span>
      </button>

      {loading
        ? Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-line p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))
        : staff.map((s) => {
            const selected = value === s._id;
            return (
              <button key={s._id} type="button" onClick={() => onChange?.(s._id)} aria-pressed={selected} className={optionClasses(selected)}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted">
                  <User className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{s.fullName}</span>
                  <span className="flex items-center gap-1 text-xs text-muted">
                    {s.nickname || 'Staff'}
                    {s.ratingCount > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        {Number(s.avgRating).toFixed(1)}
                      </>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
    </div>
  );
}
