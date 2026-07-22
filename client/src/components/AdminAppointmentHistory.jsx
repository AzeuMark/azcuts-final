import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Percent } from 'lucide-react';

import PageHeader from './PageHeader';
import DataTable from './DataTable';
import StatusBadge from './StatusBadge';
import Button from './ui/Button';
import Select from './ui/Select';
import Input from './ui/Input';
import Modal from './ui/Modal';
import adminApi from '../api/admin.api';
import { getApiErrorMessage } from '../config/axios';
import { formatMoney } from '../utils/formatMoney';
import { formatDateTime } from '../utils/datetime';

const STATUS_OPTIONS = ['all', 'pending', 'accepted', 'in_service', 'done', 'cancelled'];
const RANGE_OPTIONS = ['all', 'daily', 'weekly', 'monthly', 'yearly'];
const DISCOUNTABLE = ['pending', 'accepted', 'in_service'];

export default function AdminAppointmentHistory({ variant, title, description }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState('all');
  const [range, setRange] = useState('all');
  const [page, setPage] = useState(1);
  const [discountTarget, setDiscountTarget] = useState(null);

  const fetcher = variant === 'staff' ? adminApi.historyStaff : adminApi.historyUsers;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'history', variant, { status, range, page }],
    queryFn: () =>
      fetcher({
        status: status === 'all' ? undefined : status,
        range: range === 'all' ? undefined : range,
        page,
      }).then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });

  const appointments = data?.appointments || [];
  const pagination = data?.pagination || { page: 1, pages: 1 };

  const columns = [
    { key: 'date', header: 'Date', render: (a) => <span className="whitespace-nowrap">{formatDateTime(a.scheduledStart)}</span> },
    { key: 'receipt', header: 'Receipt', render: (a) => <span className="font-mono text-xs text-muted">{a.receiptNo}</span> },
    { key: 'customer', header: 'Customer', render: (a) => a.customer?.fullName || '—' },
    { key: 'staff', header: 'Barber', render: (a) => a.assignedStaff?.fullName || '—' },
    { key: 'service', header: 'Service', render: (a) => a.service?.name || '—' },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (a) => (
        <span>
          {a.priceSnapshot?.discountPercent > 0 && (
            <span className="mr-1 text-xs text-success">-{a.priceSnapshot.discountPercent}%</span>
          )}
          {formatMoney(a.priceSnapshot?.total, a.priceSnapshot?.currency)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (a) =>
        DISCOUNTABLE.includes(a.status) ? (
          <Button variant="ghost" size="sm" onClick={() => setDiscountTarget(a)} title="Set discount">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">Discount</span>
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader title={title} description={description} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          containerClassName="sm:max-w-[180px]"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All statuses' : s.replace('_', ' ')}
            </option>
          ))}
        </Select>
        <Select
          value={range}
          onChange={(e) => {
            setRange(e.target.value);
            setPage(1);
          }}
          containerClassName="sm:max-w-[180px]"
        >
          {RANGE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r === 'all' ? 'All time' : r}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={appointments}
        loading={isLoading}
        page={pagination.page}
        totalPages={pagination.pages}
        onPageChange={setPage}
      />

      {discountTarget && (
        <DiscountModal
          appointment={discountTarget}
          onClose={() => setDiscountTarget(null)}
          onSaved={() => {
            setDiscountTarget(null);
            qc.invalidateQueries({ queryKey: ['admin', 'history'] });
          }}
        />
      )}
    </div>
  );
}

function DiscountModal({ appointment, onClose, onSaved }) {
  const [percent, setPercent] = useState(String(appointment.priceSnapshot?.discountPercent || 0));

  const mutation = useMutation({
    mutationFn: () => adminApi.setDiscount(appointment._id, Number(percent)),
    onSuccess: () => {
      toast.success('Discount applied');
      onSaved();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not apply discount')),
  });

  const num = Number(percent);
  const invalid = Number.isNaN(num) || num < 0 || num > 100;

  return (
    <Modal
      open
      onClose={onClose}
      title="Set discount"
      description={`${appointment.service?.name || 'Appointment'} · ${appointment.receiptNo}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={invalid}>
            Apply discount
          </Button>
        </>
      }
    >
      <Input
        label="Discount percent"
        type="number"
        min={0}
        max={100}
        step="1"
        value={percent}
        onChange={(e) => setPercent(e.target.value)}
        error={invalid ? 'Enter a value between 0 and 100' : undefined}
        hint="The server recomputes the total from the price snapshot."
      />
    </Modal>
  );
}
