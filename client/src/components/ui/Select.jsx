import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import cn from '../../utils/cn';

const Select = forwardRef(function Select(
  { label, hint, error, id, className, children, containerClassName, ...props },
  ref
) {
  const autoId = useId();
  const selectId = id || autoId;

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'block w-full appearance-none rounded-md border border-line bg-surface px-3 py-2 pr-9 text-sm text-ink shadow-sm transition-colors',
            'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30',
            'disabled:cursor-not-allowed disabled:opacity-60',
            error && 'border-danger focus:border-danger focus:ring-danger/30',
            className
          )}
          aria-invalid={error ? true : undefined}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
      {error ? (
        <p className="mt-1.5 text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
});

export default Select;
