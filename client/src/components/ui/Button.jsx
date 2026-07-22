import { forwardRef } from 'react';
import cn from '../../utils/cn';
import Spinner from './Spinner';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:pointer-events-none disabled:opacity-50';

const variants = {
  primary: 'bg-brand text-brand-fg hover:bg-brand-hover shadow-sm',
  secondary: 'border border-line bg-surface-2 text-ink hover:bg-line/50',
  outline: 'border border-line bg-transparent text-ink hover:bg-surface-2',
  ghost: 'bg-transparent text-ink hover:bg-surface-2',
  subtle: 'bg-brand/10 text-brand hover:bg-brand/15',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
};

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
  icon: 'h-10 w-10 p-0',
};

// Exported so <Link>/<a> can be styled identically to a button.
export function buttonVariants({ variant = 'primary', size = 'md', className } = {}) {
  return cn(base, variants[variant] || variants.primary, sizes[size] || sizes.md, className);
}

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, loading = false, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size="sm" className="-ml-0.5" />}
      {children}
    </button>
  );
});

export default Button;
