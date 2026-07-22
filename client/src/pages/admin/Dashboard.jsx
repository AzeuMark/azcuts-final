import { useQuery } from '@tanstack/react-query';
import { Users, Scissors, CalendarDays, UserCheck, Wallet, CheckCircle2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { useAdminDashboard } from '../../hooks/useAdmin';
import adminApi from '../../api/admin.api';
import { formatMoney, formatMoneyCompact } from '../../utils/formatMoney';
import { formatDateTime } from '../../utils/datetime';

export default function Dashboard() {
  const { data, isLoading } = useAdminDashboard();
  const d = data || {};

  const recent = useQuery({
    queryKey: ['admin', 'history', 'users', { page: 1, recent: true }],
    queryFn: () => adminApi.history({ page: 1, limit: 5 }).then((r) => r.data),
    staleTime: 15_000,
  });

  const columns = [
    { key: 'date', header: 'Date', render: (a) => formatDateTime(a.scheduledStart) },
    { key: 'customer', header: 'Customer', render: (a) => a.customer?.fullName || '—' },
    { key: 'service', header: 'Service', render: (a) => a.service?.name || '—' },
    { key: 'staff', header: 'Barber', render: (a) => a.assignedStaff?.fullName || '—' },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (a) => formatMoney(a.priceSnapshot?.total, a.priceSnapshot?.currency),
    },
  ];

  return (
    <div>
      <PageHeader eyebrow="Overview · Today" title="Dashboard" description="A live snapshot of the shop today." />

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Active staff" value={d.activeStaff ?? 0} icon={UserCheck} tone="success" loading={isLoading} />
        <StatCard label="In service now" value={d.inService ?? 0} icon={Scissors} tone="brand" loading={isLoading} />
        <StatCard label="Bookings today" value={d.bookingsToday ?? 0} icon={CalendarDays} tone="info" loading={isLoading} />
        <StatCard label="Customers today" value={d.customersToday ?? 0} icon={Users} tone="accent" loading={isLoading} />
        <StatCard
          label="Sales today"
          value={formatMoneyCompact(d.salesToday ?? 0)}
          icon={Wallet}
          tone="success"
          loading={isLoading}
        />
        <StatCard label="Completed today" value={d.completedToday ?? 0} icon={CheckCircle2} tone="warning" loading={isLoading} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-serif text-xl font-semibold text-ink">Recent bookings</h2>
        <DataTable columns={columns} data={recent.data?.appointments || []} loading={recent.isLoading} />
      </div>
    </div>
  );
}
