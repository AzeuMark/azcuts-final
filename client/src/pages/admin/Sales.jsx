import { useEffect, useState } from 'react';
import { Receipt, Wallet, Search } from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatCard from '../../components/StatCard';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import { useAdminSales } from '../../hooks/useSales';
import { useBookableStaff } from '../../hooks/useBookableStaff';
import { formatMoney, formatMoneyCompact } from '../../utils/formatMoney';
import { formatDateTime } from '../../utils/datetime';

const columns = [
  {
    key: 'createdAt',
    header: 'Date',
    render: (s) => <span className="whitespace-nowrap">{formatDateTime(s.createdAt)}</span>,
  },
  { key: 'saleNo', header: 'Sale no.', render: (s) => <span className="font-mono text-xs text-muted">{s.saleNo || '—'}</span> },
  {
    key: 'items',
    header: 'Items',
    render: (s) => (s.items || []).map((i) => `${i.qty}x ${i.name}`).join(', '),
  },
  { key: 'customer', header: 'Customer', render: (s) => s.customer?.fullName || 'Walk-in' },
  { key: 'barber', header: 'Barber', render: (s) => s.barber?.fullName || '—' },
  {
    key: 'total',
    header: 'Total',
    align: 'right',
    render: (s) => formatMoney(s.total),
  },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'total_desc', label: 'Total (high → low)' },
  { value: 'total_asc', label: 'Total (low → high)' },
];

const RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All sales' },
  { value: 'counter', label: 'Counter' },
  { value: 'booking', label: 'Booking' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

// Owner review/monitor of all sales transactions (paper: "Manage Sales Records").
export default function Sales() {
  const [barber, setBarber] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [range, setRange] = useState('all');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useAdminSales({
    barber: barber || undefined,
    search: search || undefined,
    sort,
    range,
    type,
    page,
    limit,
  });
  const sales = data?.sales || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: sales.length };
  const revenue = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const staffQ = useBookableStaff();
  const staff = staffQ.data || [];

  const resetToFirstPage = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="Sales" description="Review and monitor every service and product sale." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Sales records" value={pagination.total ?? sales.length} icon={Receipt} tone="brand" loading={isLoading} />
        <StatCard label="Revenue (listed)" value={formatMoneyCompact(revenue)} icon={Wallet} tone="success" loading={isLoading} />
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Search by sale no., customer, or barber…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="sm:max-w-sm"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Select
            value={barber}
            onChange={resetToFirstPage(setBarber)}
            containerClassName="sm:max-w-[190px]"
            aria-label="Filter by barber"
          >
            <option value="">All barbers</option>
            {staff.map((s) => (
              <option key={s._id} value={s._id}>
                {s.fullName}
                {s.nickname ? ` (${s.nickname})` : ''}
              </option>
            ))}
          </Select>
          <Select
            value={type}
            onChange={resetToFirstPage(setType)}
            containerClassName="sm:max-w-[150px]"
            aria-label="Filter by sale type"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            value={range}
            onChange={resetToFirstPage(setRange)}
            containerClassName="sm:max-w-[150px]"
            aria-label="Filter by date range"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={resetToFirstPage(setSort)}
            containerClassName="sm:max-w-[190px]"
            aria-label="Sort sales"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {sales.length === 0 && !isLoading ? (
        <EmptyState
          icon={Receipt}
          title="No sales yet"
          description="Sales appear here when barbers record them or bookings complete."
        />
      ) : (
        <DataTable
          columns={columns}
          data={sales}
          loading={isLoading}
          page={pagination.page}
          totalPages={pagination.pages}
          onPageChange={setPage}
          pageSize={limit}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={(size) => {
            setLimit(size);
            setPage(1);
          }}
          total={pagination.total}
        />
      )}
    </div>
  );
}
