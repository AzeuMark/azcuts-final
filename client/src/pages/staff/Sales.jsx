import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Wallet, Plus, Search } from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import SaleModal from '../../components/SaleModal';
import { useStaffSales } from '../../hooks/useSales';
import { formatMoney } from '../../utils/formatMoney';
import { formatDateTime } from '../../utils/datetime';

const columns = [
  {
    key: 'createdAt',
    header: 'Date',
    render: (s) => formatDateTime(s.createdAt),
  },
  { key: 'saleNo', header: 'Sale no.' },
  {
    key: 'items',
    header: 'Items',
    render: (s) => (s.items || []).map((i) => `${i.qty}x ${i.name}`).join(', '),
  },
  {
    key: 'customer',
    header: 'Customer',
    render: (s) => s.customer?.fullName || 'Walk-in',
  },
  {
    key: 'total',
    header: 'Total',
    align: 'right',
    render: (s) => formatMoney(s.total),
  },
  {
    key: 'type',
    header: 'Linked',
    render: (s) =>
      s.appointment ? <Badge tone="info">Booking</Badge> : <Badge tone="neutral">Counter</Badge>,
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

// Barber's relevant sales records + recording (paper §2).
export default function Sales() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [range, setRange] = useState('all');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [saleOpen, setSaleOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useStaffSales({ search: search || undefined, sort, range, type, page, limit });
  const sales = data?.sales || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: sales.length };

  const resetToFirstPage = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="My Sales"
        description="Sales you recorded, plus service sales auto-created from your completed bookings."
        actions={
          <Button onClick={() => setSaleOpen(true)}>
            <Plus className="h-4 w-4" />
            Record sale
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Search by sale no. or customer…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="sm:max-w-sm"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
          icon={Wallet}
          title="No sales yet"
          description="Record your first counter sale, or finish a booking to auto-create one."
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

      <SaleModal
        open={saleOpen}
        onClose={() => setSaleOpen(false)}
        onSaved={() => {
          setSaleOpen(false);
          qc.invalidateQueries({ queryKey: ['staff', 'sales'] });
        }}
      />
    </div>
  );
}
