import { Check, Plus } from 'lucide-react';
import cn from '../utils/cn';
import { formatMoney } from '../utils/formatMoney';

export default function ExtraChip({ extra, selected = false, onToggle, currency = 'PHP' }) {
  return (
    <button
      type="button"
      onClick={() => onToggle?.(extra)}
      aria-pressed={selected}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-ring',
        selected ? 'border-brand bg-brand/5' : 'border-line bg-surface hover:bg-surface-2'
      )}
    >
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
          selected ? 'border-brand bg-brand text-brand-fg' : 'border-line text-muted'
        )}
      >
        {selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{extra.name}</span>
        <span className="block text-xs text-muted">
          +{formatMoney(extra.price, currency)}
          {extra.durationMinutes ? ` · +${extra.durationMinutes} min` : ''}
        </span>
      </span>
    </button>
  );
}
