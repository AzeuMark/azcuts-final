import cn from '../../utils/cn';

// Lightweight segmented tabs. `tabs` = [{ value, label }].
export function Tabs({ tabs = [], value, onChange, className }) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-lg border border-line bg-surface-2 p-1',
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-ring',
              active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
