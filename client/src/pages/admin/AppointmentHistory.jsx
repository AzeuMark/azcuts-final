import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Percent, Search, UserPlus } from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import adminApi from '../../api/admin.api';
import appointmentApi from '../../api/appointment.api';
import { useBookableStaff } from '../../hooks/useBookableStaff';
import { useFeatures } from '../../hooks/useFeatures';
import { getApiErrorMessage } from '../../config/axios';
import { formatMoney } from '../../utils/formatMoney';
import { formatDateTime } from '../../utils/datetime';

const STATUS_OPTIONS = ['all', 'pending', 'accepted', 'in_service', 'done', 'cancelled'];
const RANGE_OPTIONS = ['all', 'daily', 'weekly', 'monthly', 'yearly'];
const ASSIGNMENT_OPTIONS = [
  { value: 'all', label: 'All bookings' },
  { value: 'assigned', label: 'With barber' },
  { value: 'unassigned', label: 'Awaiting barber' },
];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'upcoming', label: 'Schedule (soonest)' },
  { value: 'scheduled', label: 'Schedule (latest)' },
  { value: 'total_desc', label: 'Total (high → low)' },
  { value: 'total_asc', label: 'Total (low → high)' },
];
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];
const DISCOUNTABLE = ['pending', 'accepted', 'in_service'];

export default function AppointmentHistory() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('all');
  const [range, setRange] = useState('all');
  const [assignment, setAssignment] = useState('all');
  const [sort, setSort] = useState('newest');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [discountTarget, setDiscountTarget] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  // S9: per-booking discounts are a non-paper extra — hidden in school mode.
  const { isEnabled } = useFeatures();
  const discountOn = isEnabled('pricing.discountPercent');

  // Debounce the search box so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'history', { status, range, assignment, sort, search, page, limit }],
    queryFn: () =>
      adminApi
        .history({
          status: status === 'all' ? undefined : status,
          range: range === 'all' ? undefined : range,
          assignment: assignment === 'all' ? undefined : assignment,
          sort,
          search: search || undefined,
          page,
          limit,
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });

  const appointments = data?.appointments || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  const resetToFirstPage = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (a) => <span className="whitespace-nowrap">{formatDateTime(a.scheduledStart)}</span>,
    },    {
      key: 'receipt',
      header: 'Receipt',
      render: (a) => <span className="font-mono text-xs text-muted">{a.receiptNo || '—'}</span>,
    },
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
      render: (a) => (
        <div className="flex items-center justify-end gap-1">
          {a.status === 'pending' && !a.assignedStaff && (
            <Button variant="ghost" size="sm" onClick={() => setAssignTarget(a)} title="Assign barber">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Assign</span>
            </Button>
          )}
          {discountOn && DISCOUNTABLE.includes(a.status) ? (
            <Button variant="ghost" size="sm" onClick={() => setDiscountTarget(a)} title="Set discount">
              <Percent className="h-4 w-4" />
              <span className="hidden sm:inline">Discount</span>
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Booking History"
        description="Every appointment across the shop. Search, filter, and set per-booking discounts before they finalize."
      />

      <div className="mb-4 flex flex-col gap-3">
        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Search by receipt, customer, or barber…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          containerClassName="sm:max-w-sm"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Select
            value={status}
            onChange={resetToFirstPage(setStatus)}
            containerClassName="sm:max-w-[170px]"
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All statuses' : s.replace('_', ' ')}
              </option>
            ))}
          </Select>
          <Select
            value={range}
            onChange={resetToFirstPage(setRange)}
            containerClassName="sm:max-w-[150px]"
            aria-label="Filter by date range"
          >
            {RANGE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r === 'all' ? 'All time' : r}
              </option>
            ))}
          </Select>
          <Select
            value={assignment}
            onChange={resetToFirstPage(setAssignment)}
            containerClassName="sm:max-w-[170px]"
            aria-label="Filter by barber assignment"
          >
            {ASSIGNMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={resetToFirstPage(setSort)}
            containerClassName="sm:max-w-[190px]"
            aria-label="Sort bookings"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={appointments}
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

      {assignTarget && (
        <AssignModal
          appointment={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSaved={() => {
            setAssignTarget(null);
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

// Manual barber assignment (paper: owner "Assign available barber/stylist").
// Lists only on-shift staff free for this booking's block; the server
// re-checks availability for the slot (409 on a race).
function AssignModal({ appointment, onClose, onSaved }) {
  const [staffId, setStaffId] = useState('');
  const staffQ = useBookableStaff(appointment?._id);

  const mutation = useMutation({
    mutationFn: () => appointmentApi.assign(appointment._id, staffId),
    onSuccess: () => {
      toast.success('Barber assigned');
      onSaved();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not assign barber')),
  });

  const staff = staffQ.data || [];

  return (
    <Modal
      open
      onClose={onClose}
      title="Assign barber"
      description={`${appointment.service?.name || 'Appointment'} · ${appointment.receiptNo} · ${formatDateTime(appointment.scheduledStart)}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!staffId}>
            Assign barber
          </Button>
        </>
      }
    >
      <Select label="Available barber" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
        <option value="">Select…</option>
        {staff.map((s) => (
          <option key={s._id} value={s._id}>
            {s.fullName}
            {s.nickname ? ` (${s.nickname})` : ''}
          </option>
        ))}
      </Select>
      {staffQ.isLoading && <p className="mt-2 text-sm text-muted">Loading barbers…</p>}
      {!staffQ.isLoading && staff.length === 0 && (
        <p className="mt-2 text-sm text-warning">No barber is free for this time — pick another slot or wait for a cancellation.</p>
      )}
      {!staffQ.isLoading && staff.length > 0 && (
        <p className="mt-2 text-xs text-muted">Only barbers free for this time are listed.</p>
      )}
    </Modal>
  );
}
