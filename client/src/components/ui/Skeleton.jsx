import cn from '../../utils/cn';

// Prefer skeletons over spinners for content that has a known shape (DESIGN.md).
export default function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-2', className)} />;
}
