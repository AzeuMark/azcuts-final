import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Boxes, History } from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Select from '../../components/ui/Select';
import StockUpdateModal from '../../components/StockUpdateModal';
import { useStockLevels, useStockMovements } from '../../hooks/useStock';
import { useAuth } from '../../hooks/useAuth';
import { formatMoney } from '../../utils/formatMoney';
import { formatDateTime } from '../../utils/datetime';

const AVAILABILITY_TONE = { in: 'success', low: 'warning', out: 'danger' };
const TYPE_TONE = { stock_in: 'success', sale: 'info', usage: 'brand', adjustment: 'warning' };

// Stock levels + movements (paper §2: barber updates stock when authorized).
export default function Inventory() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [lowOnly, setLowOnly] = useState(false);
  const [target, setTarget] = useState(null);

  const levels = useStockLevels(lowOnly);
  const movements = useStockMovements();
  const rows = levels.data || [];
  const moves = movements.data || [];
  const canUpdate = Boolean(user?.canUpdateStock);

  const columns = [
    { key: 'name', header: 'Product' },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      render: (p) => formatMoney(p.price),
    },
    {
      key: 'stockQuantity',
      header: 'On hand',
      align: 'right',
      render: (p) => p.stockQuantity,
    },
    {
      key: 'availability',
      header: 'Status',
      render: (p) => <Badge tone={AVAILABILITY_TONE[p.availability] || 'neutral'}>{p.availability}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) =>
        canUpdate ? (
          <Button variant="ghost" size="sm" onClick={() => setTarget(p)}>
            Update
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        description={
          canUpdate
            ? 'Monitor stock and record usage or sales. Every change is logged.'
            : 'Monitor stock levels. Ask an admin to grant stock access to record usage.'
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Select
          value={lowOnly ? 'low' : 'all'}
          onChange={(e) => setLowOnly(e.target.value === 'low')}
          containerClassName="sm:max-w-[200px]"
          aria-label="Filter stock levels"
        >
          <option value="all">All products</option>
          <option value="low">Low & out only</option>
        </Select>
      </div>

      {rows.length === 0 && !levels.isLoading ? (
        <EmptyState icon={Boxes} title="No products" description="Products appear here once an admin adds them." />
      ) : (
        <DataTable columns={columns} data={rows} loading={levels.isLoading} />
      )}

      <h2 className="mb-3 mt-8 flex items-center gap-2 font-serif text-xl font-semibold text-ink">
        <History className="h-5 w-5 text-brand" />
        Recent movements
      </h2>
      <DataTable
        columns={[
          { key: 'createdAt', header: 'Date', render: (m) => formatDateTime(m.createdAt) },
          { key: 'product', header: 'Product', render: (m) => m.product?.name || '' },
          {
            key: 'type',
            header: 'Type',
            render: (m) => <Badge tone={TYPE_TONE[m.type] || 'neutral'}>{m.type.replace('_', ' ')}</Badge>,
          },
          {
            key: 'change',
            header: 'Change',
            align: 'right',
            render: (m) => (m.change > 0 ? `+${m.change}` : m.change),
          },
          { key: 'recordedBy', header: 'By', render: (m) => m.byUser?.fullName || '' },
        ]}
        data={moves}
        loading={movements.isLoading}
      />

      {target && (
        <StockUpdateModal
          open={Boolean(target)}
          product={target}
          onClose={() => setTarget(null)}
          onSaved={() => {
            setTarget(null);
            qc.invalidateQueries({ queryKey: ['stock'] });
          }}
        />
      )}
    </div>
  );
}
