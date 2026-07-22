import { Scissors, Sparkles, Clock, Check } from 'lucide-react';
import cn from '../utils/cn';
import { formatMoney } from '../utils/formatMoney';
import { serverAsset } from '../utils/serverAsset';
import Button from './ui/Button';

const CATEGORY_META = {
  haircut: { icon: Scissors, label: 'Haircut', gradient: 'from-brand/25 to-brand/5', fg: 'text-brand' },
  salon: { icon: Sparkles, label: 'Salon', gradient: 'from-accent/25 to-accent/5', fg: 'text-accent' },
};

export default function ServiceCard({
  service,
  currency = 'PHP',
  onSelect,
  selected = false,
  selectable = false,
  className,
}) {
  const meta = CATEGORY_META[service.category] || CATEGORY_META.haircut;
  const Icon = meta.icon;
  const img = serverAsset(service.image);

  return (
    <div
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-card transition-all',
        selected ? 'border-brand ring-2 ring-brand/30' : 'border-line hover:shadow-card-hover',
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={service.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br', meta.gradient)}>
            <Icon className={cn('h-10 w-10 opacity-80', meta.fg)} />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
          {meta.label}
        </span>
        {selected && (
          <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-fg shadow">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-ink">{service.name}</h3>
          <span className="shrink-0 font-semibold text-ink tnum">
            {formatMoney(service.price, currency)}
          </span>
        </div>
        {service.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{service.description}</p>
        )}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Clock className="h-3.5 w-3.5" />
          {service.durationMinutes} min
        </div>

        {selectable && (
          <div className="mt-4">
            <Button
              variant={selected ? 'primary' : 'outline'}
              className="w-full"
              onClick={() => onSelect?.(service)}
            >
              {selected ? 'Selected' : 'Select'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
