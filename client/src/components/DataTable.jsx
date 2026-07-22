import cn from '../utils/cn';
import { Table, THead, TBody, TR, TH, TD } from './ui/Table';
import Skeleton from './ui/Skeleton';
import EmptyState from './ui/EmptyState';
import Pagination from './ui/Pagination';

/*
 * Generic table. columns = [{ key, header, render?(row), align?, width? }].
 * Handles loading (skeleton rows), empty state, and optional pagination so every
 * table across the app looks and behaves the same.
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  rowKey = '_id',
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
  total,
  empty,
  className,
}) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-line bg-surface shadow-card', className)}>
      <Table>
        <THead>
          <TR>
            {columns.map((c) => (
              <TH
                key={c.key}
                className={c.align === 'right' ? 'text-right' : undefined}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header}
              </TH>
            ))}
          </TR>
        </THead>
        <TBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TR key={`sk-${i}`}>
                {columns.map((c) => (
                  <TD key={c.key}>
                    <Skeleton className="h-4 w-full max-w-[180px]" />
                  </TD>
                ))}
              </TR>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                <div className="p-8">
                  {empty || (
                    <EmptyState
                      title="Nothing here yet"
                      description="Records will show up here once there's data to display."
                    />
                  )}
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <TR key={row[rowKey] ?? idx}>
                {columns.map((c) => (
                  <TD key={c.key} className={c.align === 'right' ? 'text-right tnum' : undefined}>
                    {c.render ? c.render(row) : row[c.key]}
                  </TD>
                ))}
              </TR>
            ))
          )}
        </TBody>
      </Table>
      {(totalPages > 1 || typeof onPageSizeChange === 'function') && (
        <div className="border-t border-line p-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            pageSizeOptions={pageSizeOptions}
            total={total}
          />
        </div>
      )}
    </div>
  );
}
