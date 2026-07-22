import { useState } from 'react';
import toast from 'react-hot-toast';
import { Wallet, CalendarDays, CheckCircle2, XCircle, Receipt, UserPlus, Download, FileJson } from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Button from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { ChartCard, SalesLine, HorizontalBars, StatusPie } from '../../components/ChartPanel';

import { useAnalyticsSummary, useAnalyticsSales } from '../../hooks/useAnalytics';
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
  const [exporting, setExporting] = useState(false);

  const summaryQ = useAnalyticsSummary(range);
  const salesQ = useAnalyticsSales(range);
  const s = summaryQ.data || {};
  const loading = summaryQ.isLoading;

  const moneyFmt = (v) => formatMoney(v);

  const exportReport = async (format) => {
    setExporting(true);
    try {
      if (format === 'csv') {
        const blob = await analyticsApi.report(range, 'csv');
        downloadBlob(blob, `azcuts-report-${range}.csv`);
      } else {
        const env = await analyticsApi.report(range, 'json');
        const report = env?.data ?? env;
        downloadBlob(
          new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
          `azcuts-report-${range}.json`
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

      <div className="mb-6">
        <Tabs value={range} onChange={setRange} tabs={RANGES} />
      </div>

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
          <HorizontalBars data={s.topServices || []} dataKey="revenue" color="#4F46E5" moneyFmt={moneyFmt} />
        </ChartCard>

        <ChartCard title="Status breakdown">
          <StatusPie breakdown={s.statusBreakdown || {}} />
        </ChartCard>

        <ChartCard title="Revenue by staff" className="lg:col-span-2">
          <HorizontalBars data={s.topStaff || []} dataKey="revenue" color="#14B8A6" moneyFmt={moneyFmt} />
        </ChartCard>
      </div>
    </div>
  );
}
