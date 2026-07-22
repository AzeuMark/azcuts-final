import { ChevronLeft, ChevronRight } from 'lucide-react';
import cn from '../../utils/cn';
import Button from './Button';
import Select from './Select';

const DEFAULT_PAGE_SIZES = [10, 20, 30, 50];

/*
 * Pagination bar. Renders a page-size selector (10/20/30/50 by default) on the
 * left when `onPageSizeChange` is provided, and prev/next arrows + a page
 * indicator on the right. It stays visible whenever there's a page-size selector
 * OR more than one page, so the row count control is always reachable.
 */
export default function Pagination({
  page = 1,
  totalPages = 1,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  total,
  className,
}) {
  const showSizePicker = typeof onPageSizeChange === 'function';
  if (!showSizePicker && (!totalPages || totalPages <= 1)) return null;

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex items-center gap-3">
        {showSizePicker && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="hidden sm:inline">Rows per page</span>
            <span className="sm:hidden">Rows</span>
            <Select
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              containerClassName="w-[76px]"
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </div>
        )}
        {typeof total === 'number' && (
          <span className="text-sm text-muted">
            <span className="font-medium text-ink">{total}</span> total
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <p className="text-sm text-muted">
          Page <span className="font-medium text-ink">{page}</span> of {Math.max(totalPages, 1)}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Prev</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
