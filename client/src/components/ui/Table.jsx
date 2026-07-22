import cn from '../../utils/cn';

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }) {
  return <thead className={cn('border-b border-line text-left', className)} {...props} />;
}

export function TBody(props) {
  return <tbody {...props} />;
}

export function TR({ className, ...props }) {
  return <tr className={cn('border-b border-line last:border-0', className)} {...props} />;
}

export function TH({ className, ...props }) {
  return (
    <th
      className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted', className)}
      {...props}
    />
  );
}

export function TD({ className, ...props }) {
  return <td className={cn('px-4 py-3 align-middle text-ink', className)} {...props} />;
}

export default Table;
