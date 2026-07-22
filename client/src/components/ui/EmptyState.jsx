import cn from '../../utils/cn';

// Empty states teach the next action rather than saying "nothing here" (PRODUCT.md).
export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-14 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Icon className="h-6 w-6" />
        </div>
      )}
      {title && <h3 className="text-base font-semibold text-ink">{title}</h3>}
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
