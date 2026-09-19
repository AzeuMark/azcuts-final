import { useState } from 'react';
import toast from 'react-hot-toast';
import { Wallet, CalendarDays, CheckCircle2, XCircle, Receipt, UserPlus, Download, FileJson } from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Button from '../../components/ui/Button';
import DataTable from '../../components/DataTable';
import { Tabs } from '../../components/ui/Tabs';
import { ChartCard, SalesLine, HorizontalBars, StatusPie } from '../../components/ChartPanel';

import { useAnalyticsSummary, useAnalyticsSales, useSalesSummary, useInventoryReport } from '../../hooks/useAnalytics';
import analyticsApi from '../../api/analytics.api';
import { getApiErrorMessage } from '../../config/axios';
import { formatMoney, formatMoneyCompact } from '../../utils/formatMoney';

const RANGES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'all', label: 'All time' },
];

const KINDS = [
  { value: 'appointments', label: 'Appointments' },
  { value: 'sales', label: 'Sales' },
  { value: 'inventory', label: 'Inventory' },
];

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Analytics() {
  const [range, setRange] = useState('monthly');
  const [kind, setKind] = useState('appointments');
  const [exporting, setExporting] = useState(false);

  const summaryQ = useAnalyticsSummary(range);
  const salesQ = useAnalyticsSales(range);
  const salesSummaryQ = useSalesSummary(range);
  const inventoryQ = useInventoryReport();
  const s = summaryQ.data || {};
  const loading = summaryQ.isLoading;

  const moneyFmt = (v) => formatMoney(v);

  const exportReport = async (format) => {
    setExporting(true);
    try {
      const filename = `azcuts-${kind}-report-${kind === 'inventory' ? 'all' : range}.${format}`;
      if (format === 'csv') {
        const blob = await analyticsApi.report(range, 'csv', kind);
        downloadBlob(blob, filename);
      } else {
        const env = await analyticsApi.report(range, 'json', kind);
        const report = env?.data ?? env;
        downloadBlob(
          new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
          filename
        );
      }
      toast.success('Report exported');
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Could not export report'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="KPIs, trends, and exports across date ranges."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportReport('csv')} loading={exporting}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportReport('json')} disabled={exporting}>
              <FileJson className="h-4 w-4" />
              JSON
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-col gap-3">
        <Tabs value={kind} onChange={setKind} tabs={KINDS} />
        {kind !== 'inventory' && <Tabs value={range} onChange={setRange} tabs={RANGES} />}
      </div>

      {kind === 'sales' ? (
        <SalesReport range={range} />
      ) : kind === 'inventory' ? (
        <InventoryReport />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Revenue" value={formatMoneyCompact(s.revenue ?? 0)} icon={Wallet} tone="success" loading={loading} />
            <StatCard label="Bookings" value={s.bookings ?? 0} icon={CalendarDays} tone="brand" loading={loading} />
            <StatCard label="Completed" value={s.completed ?? 0} icon={CheckCircle2} tone="info" loading={loading} />
            <StatCard label="Cancelled" value={s.cancelled ?? 0} icon={XCircle} tone="warning" loading={loading} />
            <StatCard label="Avg ticket" value={formatMoney(s.avgTicket ?? 0)} icon={Receipt} tone="accent" loading={loading} />
            <StatCard label="New customers" value={s.newCustomers ?? 0} icon={UserPlus} tone="brand" loading={loading} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <ChartCard title="Sales over time" className="lg:col-span-2">
              <SalesLine data={salesQ.data?.series || []} moneyFmt={moneyFmt} />
            </ChartCard>

            <ChartCard title="Top services (revenue)">
              <HorizontalBars data={s.topServices || []} dataKey="revenue" color="#E11D48" moneyFmt={moneyFmt} />
            </ChartCard>

            <ChartCard title="Status breakdown">
              <StatusPie breakdown={s.statusBreakdown || {}} />
            </ChartCard>

            <ChartCard title="Revenue by staff" className="lg:col-span-2">
              <HorizontalBars data={s.topStaff || []} dataKey="revenue" color="#0EA5E9" moneyFmt={moneyFmt} />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

// Sales report tab (S8): KPIs from the sales collection + top tables.
function SalesReport({ range }) {
  const q = useSalesSummary(range);
  const d = q.data || {};
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Revenue" value={formatMoneyCompact(d.revenue ?? 0)} icon={Wallet} tone="success" loading={q.isLoading} />
        <StatCard label="Sales" value={d.sales ?? 0} icon={Receipt} tone="brand" loading={q.isLoading} />
        <StatCard label="Avg ticket" value={formatMoney(d.avgTicket ?? 0)} icon={Receipt} tone="accent" loading={q.isLoading} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 font-serif text-lg font-semibold text-ink">Top products</h3>
          <DataTable
            columns={[
              { key: 'name', header: 'Product' },
              { key: 'qty', header: 'Qty', align: 'right' },
              { key: 'revenue', header: 'Revenue', align: 'right', render: (t) => formatMoney(t.revenue) },
            ]}
            data={d.topProducts || []}
            loading={q.isLoading}
          />
        </div>
        <div>
          <h3 className="mb-3 font-serif text-lg font-semibold text-ink">Top barbers</h3>
          <DataTable
            columns={[
              { key: 'name', header: 'Barber', render: (t) => t.name || '—' },
              { key: 'count', header: 'Sales', align: 'right' },
              { key: 'revenue', header: 'Revenue', align: 'right', render: (t) => formatMoney(t.revenue) },
            ]}
            data={d.topBarbers || []}
            loading={q.isLoading}
          />
        </div>
      </div>
    </div>
  );
}

// Inventory report tab (S8): counts + live stock levels.
function InventoryReport() {
  const q = useInventoryReport();
  const d = q.data || {};
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Products" value={d.products ?? 0} icon={CalendarDays} tone="brand" loading={q.isLoading} />
        <StatCard label="Low stock" value={d.lowStock ?? 0} icon={XCircle} tone="warning" loading={q.isLoading} />
        <StatCard label="Out of stock" value={d.outOfStock ?? 0} icon={XCircle} tone="warning" loading={q.isLoading} />
      </div>
      <h3 className="mb-3 mt-6 font-serif text-lg font-semibold text-ink">Stock levels</h3>
      <DataTable
        columns={[
          { key: 'name', header: 'Product' },
          { key: 'price', header: 'Price', align: 'right', render: (l) => formatMoney(l.price) },
          { key: 'stockQuantity', header: 'On hand', align: 'right' },
          { key: 'availability', header: 'Status' },
        ]}
        data={d.levels || []}
        loading={q.isLoading}
      />
    </div>
  );
}
