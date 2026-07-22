import cn from '../../utils/cn';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn('rounded-2xl border border-line bg-surface shadow-card', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1 border-b border-line p-5', className)} {...props} />;
}

export function CardTitle({ className, as: Tag = 'h3', ...props }) {
  return <Tag className={cn('text-base font-semibold text-ink', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return (
    <div className={cn('flex items-center gap-3 border-t border-line p-5', className)} {...props} />
  );
}

export default Card;
