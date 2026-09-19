import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Wallet, Plus } from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
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

// Barber's relevant sales records + recording (paper §2).
export default function Sales() {
  const qc = useQueryClient();
  const { data, isLoading } = useStaffSales();
  const [saleOpen, setSaleOpen] = useState(false);
  const sales = data || [];

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

      {sales.length === 0 && !isLoading ? (
        <EmptyState
          icon={Wallet}
          title="No sales yet"
          description="Record your first counter sale, or finish a booking to auto-create one."
        />
      ) : (
        <DataTable columns={columns} data={sales} loading={isLoading} />
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
