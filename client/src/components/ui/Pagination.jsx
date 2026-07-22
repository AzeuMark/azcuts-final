import { ChevronLeft, ChevronRight } from 'lucide-react';
import cn from '../../utils/cn';
import Button from './Button';

export default function Pagination({ page = 1, totalPages = 1, onPageChange, className }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <p className="text-sm text-muted">
        Page <span className="font-medium text-ink">{page}</span> of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange?.(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(page + 1)}
          disabled={page >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
