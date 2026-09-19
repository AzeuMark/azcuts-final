import { useState } from 'react';
import { Receipt, Wallet } from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import { useAdminSales } from '../../hooks/useSales';
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

// Owner review/monitor of all sales transactions (paper: "Manage Sales Records").
export default function Sales() {
  const [barber, setBarber] = useState('');
  const { data, isLoading } = useAdminSales({ barber: barber || undefined });
  const sales = data || [];
  const revenue = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  return (
    <div>
      <PageHeader title="Sales" description="Review and monitor every service and product sale." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Sales records" value={sales.length} icon={Receipt} tone="brand" loading={isLoading} />
        <StatCard label="Revenue (listed)" value={formatMoneyCompact(revenue)} icon={Wallet} tone="success" loading={isLoading} />
      </div>

      {sales.length === 0 && !isLoading ? (
        <EmptyState
          icon={Receipt}
          title="No sales yet"
          description="Sales appear here when barbers record them or bookings complete."
        />
      ) : (
        <DataTable columns={columns} data={sales} loading={isLoading} />
      )}
    </div>
  );
}
