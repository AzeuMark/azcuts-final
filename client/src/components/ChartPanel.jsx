import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import EmptyState from './ui/EmptyState';

// Status → hex (Recharts needs literal colors, so these mirror the tokens).
export const STATUS_COLORS = {
  pending: '#D97706',
  accepted: '#2563EB',
  in_service: '#4F46E5',
  done: '#16A34A',
  cancelled: '#DC2626',
};

const AXIS = '#9CA3AF'; // mid-gray, legible in both themes
const GRID = 'rgb(148 163 184 / 0.18)';

export function ChartCard({ title, actions, children, className }) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// Themed tooltip so it reads well in dark mode too.
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-pop">
      {label != null && <p className="mb-1 font-medium text-ink">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="text-muted">
          <span style={{ color: p.color || p.fill }}>{p.name}: </span>
          <span className="font-medium text-ink">{formatter ? formatter(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

const empty = (msg) => <EmptyState title="No data yet" description={msg} className="border-0 bg-transparent py-10" />;

export function SalesLine({ data = [], moneyFmt }) {
  if (!data.length) return empty('Sales will appear here once appointments are completed.');
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="period" tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} width={48} />
        <Tooltip content={<ChartTooltip formatter={moneyFmt} />} />
        <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#E11D48" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({ data = [], dataKey, color = '#E11D48', moneyFmt }) {
  if (!data.length) return empty('Not enough data to chart yet.');
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 46)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: GRID }} content={<ChartTooltip formatter={moneyFmt} />} />
        <Bar dataKey={dataKey} name={dataKey === 'revenue' ? 'Revenue' : 'Count'} fill={color} radius={[0, 6, 6, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPie({ breakdown = {} }) {
  const data = Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .map(([status, value]) => ({ name: status.replace('_', ' '), value, status }));
  if (!data.length) return empty('No appointments in this range.');
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.status} fill={STATUS_COLORS[d.status] || '#9CA3AF'} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
