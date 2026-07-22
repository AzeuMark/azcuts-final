import cn from '../../utils/cn';

const tones = {
  neutral: 'bg-surface-2 text-muted ring-1 ring-inset ring-line',
  brand: 'bg-brand/10 text-brand ring-1 ring-inset ring-brand/25',
  accent: 'bg-accent/10 text-accent ring-1 ring-inset ring-accent/25',
  success: 'bg-success/10 text-success ring-1 ring-inset ring-success/25',
  warning: 'bg-warning/10 text-warning ring-1 ring-inset ring-warning/25',
  danger: 'bg-danger/10 text-danger ring-1 ring-inset ring-danger/25',
  info: 'bg-info/10 text-info ring-1 ring-inset ring-info/25',
};

export default function Badge({ tone = 'neutral', className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone] || tones.neutral,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
