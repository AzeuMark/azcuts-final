import GuideLayout from '../GuideLayout';
import { BackLinks } from '../FeatureCard';
import { useTheme } from '../../hooks/useTheme';

// ONE connected system-design diagram (single SVG): every actor, page, server,
// and store from the AzCuts build in one imagery, wired with labeled flows.
// Icons are free PNGs from Icons8 (https://icons8.com — `img.icons8.com`
// set, hotlink-allowed; each URL verified live-200). An emoji glyph sits
// under every icon so a failed image still leaves a readable node.

const I = {
  customer: ['https://img.icons8.com/color/96/user.png', '👤'],
  device: ['https://img.icons8.com/color/96/computer.png', '🖥️'],
  network: ['https://img.icons8.com/color/96/network.png', '🌐'],
  website: ['https://img.icons8.com/color/96/domain.png', '🏠'],
  login: ['https://img.icons8.com/color/96/password.png', '🔑'],
  portal: ['https://img.icons8.com/color/96/calendar.png', '📅'],
  barber: ['https://img.icons8.com/color/96/barber-pole.png', '💈'],
  queue: ['https://img.icons8.com/color/96/scissors.png', '✂️'],
  table: ['https://img.icons8.com/color/96/data-sheet.png', '📋'],
  server: ['https://img.icons8.com/color/96/server.png', '🗄️'],
  database: ['https://img.icons8.com/color/96/database.png', '💾'],
  core: ['https://img.icons8.com/color/96/cash.png', '⚙️'],
  owner: ['https://img.icons8.com/color/96/admin-settings-male.png', '🧑‍💼'],
  dash: ['https://img.icons8.com/color/96/dashboard.png', '📊'],
  reports: ['https://img.icons8.com/color/96/business-report.png', '📈'],
  sale: ['https://img.icons8.com/color/96/receipt.png', '🧾'],
  stock: ['https://img.icons8.com/color/96/box.png', '📦'],
};

const W = 140;
const H = 112;

// 6-column grid (x) × 3 rows (y). Row 3 leaves col 6 empty for the bus label.
const NODES = [
  { id: 'customer', x: 15, y: 20, icon: 'customer', title: 'Customer', sub: 'books + history' },
  { id: 'device', x: 205, y: 20, icon: 'device', title: 'Device', sub: 'phone / PC' },
  { id: 'network', x: 395, y: 20, icon: 'network', title: 'Network', sub: 'internet' },
  { id: 'website', x: 585, y: 20, icon: 'website', title: 'Website', sub: '/ landing' },
  { id: 'login', x: 775, y: 20, icon: 'login', title: 'Login Form', sub: 'slide-in panel' },
  { id: 'portal', x: 965, y: 20, icon: 'portal', title: 'Customer Portal', sub: '/app/book' },
  { id: 'barber', x: 15, y: 230, icon: 'barber', title: 'Barber', sub: 'serves queue' },
  { id: 'queue', x: 205, y: 230, icon: 'queue', title: 'Barber Queue', sub: '/staff/dashboard' },
  { id: 'appts', x: 395, y: 230, icon: 'table', title: 'Appointments', sub: 'booking rows' },
  { id: 'api', x: 585, y: 230, icon: 'server', title: 'Web Server', sub: 'Express :5000' },
  { id: 'db', x: 775, y: 230, icon: 'database', title: 'Database', sub: 'MongoDB' },
  { id: 'core', x: 965, y: 230, icon: 'core', title: 'AzCuts Core', sub: 'booking engine' },
  { id: 'owner', x: 15, y: 440, icon: 'owner', title: 'Owner', sub: 'system admin' },
  { id: 'odash', x: 205, y: 440, icon: 'dash', title: 'Owner Dash', sub: '/admin' },
  { id: 'reports', x: 395, y: 440, icon: 'reports', title: 'Reports', sub: '/analytics' },
  { id: 'sale', x: 585, y: 440, icon: 'sale', title: 'Sale', sub: 'SL-… receipt' },
  { id: 'stock', x: 775, y: 440, icon: 'stock', title: 'Stock', sub: 'levels + ledger' },
];

const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
const R = (id) => ({ x: byId[id].x + W, y: byId[id].y + H / 2 });
const L = (id) => ({ x: byId[id].x, y: byId[id].y + H / 2 });
const T = (id) => ({ x: byId[id].x + W / 2, y: byId[id].y });
const B = (id) => ({ x: byId[id].x + W / 2, y: byId[id].y + H });
const line = (a, b) => `M${a.x},${a.y} L${b.x},${b.y}`;

// [path, label, lx, ly, options] — lx/ly place the label pill.
const EDGES = [
  [line(R('customer'), L('device')), 'uses', 180, 64, {}],
  [line(R('device'), L('network')), 'connects', 370, 64, {}],
  [line(R('network'), L('website')), 'opens', 560, 64, {}],
  [line(R('website'), L('login')), 'login', 750, 64, {}],
  [line(R('login'), L('portal')), 'login', 940, 64, {}],
  [line(B('portal'), T('core')), 'book / view', 1043, 181, {}],
  [line(R('barber'), L('queue')), 'accept · serve', 180, 274, {}],
  [line(R('queue'), L('appts')), 'serve / record', 370, 274, {}],
  [line(R('appts'), L('api')), 'store data', 560, 274, {}],
  [line(R('api'), L('db')), 'connects', 750, 274, { both: true }],
  [line(R('db'), L('core')), 'provide data', 940, 274, {}],
  [line(B('appts'), T('reports')), 'generate reports', 473, 391, {}],
  [line(B('api'), T('sale')), 'record sale', 663, 391, {}],
  [line(B('db'), T('stock')), 'stock levels', 853, 391, {}],
  // Core drops below row 3 onto a bus, runs left, rises into Sale (avoids crossings).
  ['M1035,342 L1035,600 L655,600 L655,552', 'auto sale on done', 845, 592, {}],
  [line(R('owner'), L('odash')), 'manage', 180, 484, {}],
  [line(T('odash'), B('queue')), 'assign barber', 283, 391, { up: true }],
  [line(L('reports'), R('odash')), 'submit reports', 370, 484, { left: true }],
  [line(R('sale'), L('stock')), 'decrements', 750, 484, {}],
];

const NODE_MAP = [
  ['Customer → Device → Network → Website', '/ (landing) on a phone/PC browser', 'GET /api/settings/public (services, barbers, hours)'],
  ['Login Form → Customer Portal', 'Landing slide-in panel → /app/book', 'POST /api/auth/login · POST /api/appointments'],
  ['Barber → Barber Queue', '/staff/dashboard: Incoming + My queue', 'PATCH /api/staff/appointments/:id/accept · PATCH /api/appointments/:id/status'],
  ['Appointments → Web Server → Database', 'Every booking row (receipt no., status, barber)', 'Slots, pricing + state machine enforced server-side'],
  ['AzCuts Core → Sale → Stock', 'Done booking auto-creates SL-… sale; stock decrements', 'POST /api/sales · PATCH /api/inventory/update'],
  ['Reports → Owner Dash → Owner', '/analytics tabs + CSV/JSON; assign + manage', 'GET /api/analytics/report?kind= · PATCH /api/appointments/:id/assign'],
];

function Diagram() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const fill = dark ? '#171A21' : '#FFFFFF';
  const stroke = '#0EA5E9';
  const text = dark ? '#F3F4F6' : '#111827';
  const sub = dark ? '#9CA3AF' : '#6B7280';
  const edge = '#0EA5E9';
  const pill = dark ? '#1F232C' : '#F1F3F7';
  const pillStroke = dark ? '#232733' : '#E5E7EB';

  return (
    <svg
      viewBox="0 0 1120 640"
      className="h-auto w-full"
      role="img"
      aria-label="AzCuts connected system design diagram"
      fontFamily="Inter, system-ui, sans-serif"
    >
      <defs>
        <marker id="arr" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M0,0 L8,4.5 L0,9 z" fill={edge} />
        </marker>
        <marker id="arrL" markerWidth="9" markerHeight="9" refX="1" refY="4.5" orient="auto">
          <path d="M8,0 L0,4.5 L8,9 z" fill={edge} />
        </marker>
      </defs>

      {EDGES.map(([d, label, lx, ly, o], i) => {
        const w = label.length * 6.2 + 18;
        const leftward = o.left;
        return (
          <g key={i}>
            <path
              d={d}
              fill="none"
              stroke={edge}
              strokeWidth="2"
              markerEnd={leftward ? undefined : 'url(#arr)'}
              markerStart={o.both || leftward ? 'url(#arrL)' : undefined}
            />
            <rect
              x={lx - w / 2}
              y={ly - 11}
              width={w}
              height={20}
              rx={10}
              fill={pill}
              stroke={pillStroke}
            />
            <text x={lx} y={ly + 3.5} textAnchor="middle" fontSize="10.5" fill={sub}>
              {label}
            </text>
          </g>
        );
      })}

      {NODES.map((n) => {
        const [src, emoji] = I[n.icon];
        return (
          <g key={n.id}>
            <rect x={n.x} y={n.y} width={W} height={H} rx={14} fill={fill} stroke={stroke} strokeWidth="1.5" />
            <text x={n.x + W / 2} y={n.y + 52} textAnchor="middle" fontSize="32">
              {emoji}
            </text>
            <image href={src} x={n.x + W / 2 - 24} y={n.y + 10} width={48} height={48} />
            <text x={n.x + W / 2} y={n.y + 80} textAnchor="middle" fontSize="13" fontWeight="700" fill={text}>
              {n.title}
            </text>
            <text x={n.x + W / 2} y={n.y + 97} textAnchor="middle" fontSize="10.5" fill={sub}>
              {n.sub}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function SystemDesign() {
  return (
    <GuideLayout
      title="System detail design — one connected diagram"
      description="The whole AzCuts build as a single imagery: access chain on top, data engine in the middle, reports and ownership at the bottom — every box wired with a labeled flow. Follow the arrows from the customer all the way to the reports."
    >
      <figure className="overflow-x-auto rounded-2xl border border-line bg-surface p-4 shadow-card">
        <div className="min-w-[760px]">
          <Diagram />
        </div>
        <figcaption className="mt-3 text-center text-xs text-muted">
          AzCuts connected flow: Customer → Device → Network → Website → Login → Portal → Core → Database → Sale → Stock → Reports → Owner (17 nodes, 19 labeled flows)
        </figcaption>
      </figure>

      <h2 className="mb-3 mt-10 font-serif text-xl font-semibold">Reading the diagram → page → API</h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-3">Diagram path</th>
              <th className="px-4 py-3">Page in this build</th>
              <th className="px-4 py-3">API behind it</th>
            </tr>
          </thead>
          <tbody>
            {NODE_MAP.map(([box, page, api]) => (
              <tr key={box} className="border-b border-line align-top last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{box}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{page}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink/80">{api}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-muted">
        Icons by <a className="text-brand hover:underline" href="https://icons8.com" target="_blank" rel="noreferrer">Icons8</a> (free
        `color/96` set). Flaticon equivalents (also free with attribution): user, computer, network, website, login,
        dashboard, data-sheet, server, database, report — at{' '}
        <a className="text-brand hover:underline" href="https://www.flaticon.com" target="_blank" rel="noreferrer">flaticon.com</a>.
      </p>

      <BackLinks
        links={[
          { to: '/guide/hipo-ipo', label: 'HIPO + IPO' },
          { to: '/guide/database', label: 'Database chart' },
          { to: '/guide', label: 'Guide start' },
        ]}
      />
    </GuideLayout>
  );
}
