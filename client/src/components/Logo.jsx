import { Link } from 'react-router-dom';
import cn from '../utils/cn';

// Brand lockup used by the public navbar, dashboard topbar, landing hero, and receipt.
// Sourced from /assets/website-logo.png (moved into the client in Phase 0).
export default function Logo({ to = '/', className, imgClassName, showWordmark = true, size = 32 }) {
  const content = (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img
        src="/assets/website-logo.png"
        alt="AzCuts"
        width={size}
        height={size}
        className={cn('rounded-md object-contain', imgClassName)}
        style={{ height: size, width: size }}
      />
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight text-ink">AzCuts</span>
      )}
    </span>
  );

  if (to) {
    return (
      <Link to={to} className="focus-ring inline-flex rounded-md" aria-label="AzCuts home">
        {content}
      </Link>
    );
  }
  return content;
}
