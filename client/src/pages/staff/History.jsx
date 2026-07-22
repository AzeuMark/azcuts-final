import { ClipboardList, Star, CheckCircle2, MessageSquare } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import DataTable from '../../components/DataTable';
import RatingStars from '../../components/RatingStars';
import EmptyState from '../../components/ui/EmptyState';
import { useStaffHistory } from '../../hooks/useStaff';
import { formatMoney } from '../../utils/formatMoney';
import { formatDateTime, fromNow } from '../../utils/datetime';

export default function History() {
  const { data, isLoading } = useStaffHistory();
  const appointments = data?.appointments || [];
  const stats = data?.stats || { totalServed: 0, avgRating: 0, ratingCount: 0 };
  const ratings = data?.ratings || [];

  const columns = [
    { key: 'date', header: 'Finished', render: (a) => formatDateTime(a.finishedAt || a.scheduledStart) },
    { key: 'service', header: 'Service', render: (a) => a.service?.name || '—' },
    { key: 'customer', header: 'Customer', render: (a) => a.customer?.fullName || '—' },
    {
      key: 'rating',
      header: 'Rating',
      render: (a) =>
        a.rating?.stars ? <RatingStars value={a.rating.stars} readOnly size="sm" /> : <span className="text-muted">—</span>,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (a) => formatMoney(a.priceSnapshot?.total, a.priceSnapshot?.currency),
    },
  ];

  return (
    <div>
      <PageHeader title="Served History" description="Your completed appointments and ratings." />

      <div className="stagger mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total served" value={stats.totalServed} icon={CheckCircle2} tone="success" loading={isLoading} />
        <StatCard
          label="Average rating"
          value={stats.ratingCount ? Number(stats.avgRating).toFixed(2) : '—'}
          icon={Star}
          tone="warning"
          hint={`${stats.ratingCount} rating${stats.ratingCount === 1 ? '' : 's'}`}
          loading={isLoading}
        />
        <StatCard label="Reviews" value={ratings.length} icon={MessageSquare} tone="brand" loading={isLoading} />
      </div>

      <h2 className="mb-3 font-serif text-xl font-semibold text-ink">Completed appointments</h2>
      <DataTable
        columns={columns}
        data={appointments}
        loading={isLoading}
        empty={<EmptyState icon={ClipboardList} title="Nothing served yet" description="Completed appointments will show up here." />}
      />

      {ratings.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-serif text-xl font-semibold text-ink">Recent reviews</h2>
          <div className="space-y-3">
            {ratings
              .filter((r) => r.comment)
              .map((r) => (
                <div key={r.appointmentId} className="rounded-xl border border-line bg-surface p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <RatingStars value={r.stars} readOnly size="sm" />
                    <span className="text-xs text-muted">{r.ratedAt ? fromNow(r.ratedAt) : ''}</span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-ink">{r.comment}</p>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
