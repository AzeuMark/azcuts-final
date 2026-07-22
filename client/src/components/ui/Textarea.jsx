import { forwardRef, useId } from 'react';
import cn from '../../utils/cn';

const Textarea = forwardRef(function Textarea(
  { label, hint, error, id, className, rows = 4, containerClassName, ...props },
  ref
) {
  const autoId = useId();
  const areaId = id || autoId;

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={areaId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        ref={ref}
        rows={rows}
        className={cn(
          'block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-muted',
          'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30',
          'disabled:cursor-not-allowed disabled:opacity-60 resize-y',
          error && 'border-danger focus:border-danger focus:ring-danger/30',
          className
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
});

export default Textarea;
