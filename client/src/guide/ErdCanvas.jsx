import { useRef, useState } from 'react';
import { RotateCcw, Table, Scaling } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

// Interactive ERD: every collection is a draggable table; connectors are
// recomputed from live node positions on each move, so arrows never break.
// Positions persist in localStorage (`az-erd-pos`) with a reset button.

const W = 230;
const ROW_H = 17;
const HEAD_H = 34;

const TABLES = [
  {
    id: 'users',
    title: 'users',
    fields: [
      ['_id PK', 'pk'], ['fullName', ''], ['username UK', 'uk'], ['email UK', 'uk'],
      ['role', ''], ['status', ''], ['canUpdateStock', ''],
    ],
  },
  {
    id: 'services',
    title: 'services',
    fields: [
      ['_id PK', 'pk'], ['name', ''], ['category', ''], ['price', ''],
      ['durationMinutes', ''], ['isActive', ''],
    ],
  },
  {
    id: 'appointments',
    title: 'appointments',
    fields: [
      ['_id PK', 'pk'], ['receiptNo UK', 'uk'], ['customer FK', 'fk'], ['assignedStaff FK', 'fk'],
      ['service FK', 'fk'], ['status', ''], ['saleId FK', 'fk'],
    ],
  },
  {
    id: 'sales',
    title: 'sales',
    fields: [
      ['_id PK', 'pk'], ['saleNo UK', 'uk'], ['customer FK', 'fk'], ['barber FK', 'fk'],
      ['recordedBy FK', 'fk'], ['appointment FK', 'fk'], ['total', ''],
    ],
  },
  {
    id: 'products',
    title: 'products',
    fields: [
      ['_id PK', 'pk'], ['name', ''], ['price', ''], ['stockQuantity', ''],
      ['lowStockThreshold', ''], ['isActive', ''],
    ],
  },
  {
    id: 'inventory',
    title: 'inventory',
    fields: [
      ['_id PK', 'pk'], ['product FK', 'fk'], ['change', ''], ['type', ''], ['referenceSale FK', 'fk'],
    ],
  },
  {
    id: 'settings',
    title: 'settings',
    fields: [[' _id "system"', 'pk'], ['systemMode', ''], ['timezone', ''], ['storeHours', '']],
  },
  {
    id: 'refreshtokens',
    title: 'refreshtokens',
    fields: [['token UK', 'uk'], ['user FK', 'fk']],
  },
];

// [from, to, label, fromEnd, toEnd]
const RELS = [
  ['users', 'appointments', 'books (customer)', '1', 'N'],
  ['users', 'appointments', 'serves (staff)', '1', 'N'],
  ['services', 'appointments', 'booked as', '1', 'N'],
  ['appointments', 'sales', 'auto-creates on done', '1', '0..1'],
  ['users', 'sales', 'records', '1', 'N'],
  ['users', 'sales', 'performs', '1', 'N'],
  ['users', 'sales', 'buys', '1', 'N'],
  ['products', 'inventory', 'tracked by', '1', 'N'],
  ['products', 'sales', 'sold in (snapshot)', '1', 'N'],
  ['services', 'sales', 'sold in (snapshot)', '1', 'N'],
  ['sales', 'inventory', 'decrements', '1', 'N'],
  ['users', 'inventory', 'moves stock', '1', 'N'],
  ['users', 'refreshtokens', 'sessions', '1', 'N'],
];

const DEFAULT_POS = {
  users: { x: 20, y: 80 },
  services: { x: 20, y: 360 },
  appointments: { x: 300, y: 40 },
  sales: { x: 300, y: 300 },
  products: { x: 580, y: 40 },
  inventory: { x: 580, y: 300 },
  settings: { x: 860, y: 80 },
  refreshtokens: { x: 860, y: 300 },
};

const nodeH = (t) => HEAD_H + t.fields.length * ROW_H + 8;

function loadPos() {
  try {
    const raw = localStorage.getItem('az-erd-pos');
    if (raw) return { ...DEFAULT_POS, ...JSON.parse(raw) };
  } catch { /* fresh layout */ }
  return { ...DEFAULT_POS };
}

function loadSize() {
  try {
    const raw = localStorage.getItem('az-erd-size');
    if (raw) {
      const s = JSON.parse(raw);
      if (s.w >= 800 && s.h >= 400) return s;
    }
  } catch { /* default canvas */ }
  return { w: 1120, h: 560 };
}

function loadClassic() {
  try { return localStorage.getItem('az-erd-style') === 'classic'; } catch { return false; }
}

// Intersection of a center-to-center ray with the node's rect border.
function clipBorder(p, w, h, dx, dy) {
  const tx = dx === 0 ? Infinity : w / 2 / Math.abs(dx);
  const ty = dy === 0 ? Infinity : h / 2 / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: p.x + dx * t, y: p.y + dy * t };
}

const qPoint = (p0, c, p2, t) => ({
  x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * c.x + t * t * p2.x,
  y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * c.y + t * t * p2.y,
});

export default function ErdCanvas() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [pos, setPos] = useState(loadPos);
  const [size, setSize] = useState(loadSize);
  const [classic, setClassic] = useState(loadClassic);
  const svgRef = useRef(null);
  const drag = useRef(null);
  const rsz = useRef(null);

  // Classic = plain black-and-white ERD tables, square corners. Modern keeps
  // the theme-aware rounded look. Classic stays black-on-white in both themes.
  const fill = classic ? '#FFFFFF' : dark ? '#171A21' : '#FFFFFF';
  const headFill = classic ? '#FFFFFF' : dark ? '#1F232C' : '#F1F3F7';
  const stroke = classic ? '#000000' : '#0EA5E9';
  const text = classic ? '#000000' : dark ? '#F3F4F6' : '#111827';
  const sub = classic ? '#000000' : dark ? '#9CA3AF' : '#6B7280';
  const fkColor = classic ? '#000000' : '#0EA5E9';
  const edge = classic ? '#000000' : '#0EA5E9';
  const pill = classic ? '#FFFFFF' : dark ? '#1F232C' : '#F1F3F7';
  const pillStroke = classic ? '#000000' : dark ? '#232733' : '#E5E7EB';
  const corner = classic ? 0 : 12;

  const toSvg = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * size.w, y: ((e.clientY - r.top) / r.height) * size.h };
  };

  const onNodeDown = (id) => (e) => {
    e.preventDefault();
    const p = toSvg(e);
    drag.current = { id, dx: p.x - pos[id].x, dy: p.y - pos[id].y };
    e.target.setPointerCapture?.(e.pointerId);
  };

  const onMove = (e) => {
    if (!drag.current) return;
    const p = toSvg(e);
    const { id, dx, dy } = drag.current;
    const nx = Math.min(size.w - W, Math.max(0, p.x - dx));
    const ny = Math.min(size.h - 40, Math.max(0, p.y - dy));
    setPos((prev) => ({ ...prev, [id]: { x: Math.round(nx), y: Math.round(ny) } }));
  };

  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    try { localStorage.setItem('az-erd-pos', JSON.stringify(pos)); } catch { /* private mode */ }
  };

  const reset = () => {
    try { localStorage.removeItem('az-erd-pos'); } catch { /* ignore */ }
    setPos({ ...DEFAULT_POS });
  };

  const toggleStyle = () => {
    setClassic((c) => {
      try { localStorage.setItem('az-erd-style', c ? 'modern' : 'classic'); } catch { /* ignore */ }
      return !c;
    });
  };

  // Canvas resize via the corner grip: drag to grow/shrink the playground.
  const onGripDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const r = svgRef.current.getBoundingClientRect();
    rsz.current = {
      sx: e.clientX, sy: e.clientY, w: size.w, h: size.h,
      scaleX: size.w / r.width, scaleY: size.h / r.height,
    };
    window.addEventListener('pointermove', onGripMove);
    window.addEventListener('pointerup', onGripUp, { once: true });
  };

  const onGripMove = (e) => {
    const s = rsz.current;
    if (!s) return;
    const w = Math.min(2400, Math.max(800, Math.round((s.w + (e.clientX - s.sx) * s.scaleX) / 20) * 20));
    const h = Math.min(1600, Math.max(400, Math.round((s.h + (e.clientY - s.sy) * s.scaleY) / 20) * 20));
    setSize({ w, h });
    try { localStorage.setItem('az-erd-size', JSON.stringify({ w, h })); } catch { /* ignore */ }
  };

  const onGripUp = () => {
    window.removeEventListener('pointermove', onGripMove);
    // Pull any tables back inside if the canvas shrank past them.
    setSize((s) => {
      setPos((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          const t = TABLES.find((x) => x.id === id);
          next[id] = {
            x: Math.min(s.w - W, Math.max(0, next[id].x)),
            y: Math.min(s.h - 40, Math.max(0, next[id].y)),
          };
        });
        return next;
      });
      return s;
    });
    rsz.current = null;
  };

  const center = (id) => {
    const t = TABLES.find((x) => x.id === id);
    return { x: pos[id].x + W / 2, y: pos[id].y + nodeH(t) / 2 };
  };

  // Spread parallel edges (same pair) so each keeps its own lane while dragging.
  const pairTotal = {};
  RELS.forEach(([a, b]) => {
    const k = [a, b].sort().join('|');
    pairTotal[k] = (pairTotal[k] || 0) + 1;
  });
  const pairSeen = {};
  const laneOf = (a, b) => {
    const k = [a, b].sort().join('|');
    pairSeen[k] = (pairSeen[k] || 0) + 1;
    return pairSeen[k];
  };
  const laneCurve = (n, i) => {
    if (n === 1) return 0;
    if (n === 2) return i === 1 ? -42 : 42;
    return (i - 2) * 55;
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Drag any table — its arrows follow without breaking. Drag the corner grip to resize the playground ({size.w}×{size.h}).
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleStyle}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-brand"
            title={classic ? 'Switch to the rounded theme-aware style' : 'Switch to plain black-and-white tables'}
          >
            <Table className="h-4 w-4" /> {classic ? 'Modern style' : 'Classic style'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-brand"
          >
            <RotateCcw className="h-4 w-4" /> Reset layout
          </button>
        </div>
      </div>
      <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size.w} ${size.h}`}
        className="h-auto w-full select-none"
        role="img"
        aria-label="Interactive AzCuts database diagram — drag tables to rearrange"
        fontFamily="Inter, system-ui, sans-serif"
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <defs>
          <marker id="erd-arr" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0,0 L9,5 L0,10 z" fill={edge} />
          </marker>
        </defs>

        {RELS.map(([a, b, label, fromEnd, toEnd], i) => {
          const ta = TABLES.find((x) => x.id === a);
          const tb = TABLES.find((x) => x.id === b);
          const ca = center(a);
          const cb = center(b);
          const dx = cb.x - ca.x;
          const dy = cb.y - ca.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const p0 = clipBorder(ca, W, nodeH(ta), ux, uy);
          const p2 = clipBorder(cb, W, nodeH(tb), -ux, -uy);
          const k = [a, b].sort().join('|');
          const curve = laneCurve(pairTotal[k], laneOf(a, b));
          const mx = (p0.x + p2.x) / 2;
          const my = (p0.y + p2.y) / 2;
          const c = { x: mx - uy * curve, y: my + ux * curve };
          const mid = qPoint(p0, c, p2, 0.5);
          const e1 = qPoint(p0, c, p2, 0.1);
          const e2 = qPoint(p0, c, p2, 0.9);
          const w = label.length * 6.2 + 18;
          return (
            <g key={i}>
              <path d={`M${p0.x},${p0.y} Q${c.x},${c.y} ${p2.x},${p2.y}`} fill="none" stroke={edge} strokeWidth="1.8" markerEnd="url(#erd-arr)" />
              <text x={e1.x} y={e1.y - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={sub}>{fromEnd}</text>
              <text x={e2.x} y={e2.y - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={sub}>{toEnd}</text>
              <rect x={mid.x - w / 2} y={mid.y - 11} width={w} height={20} rx={classic ? 0 : 10} fill={pill} stroke={pillStroke} />
              <text x={mid.x} y={mid.y + 3.5} textAnchor="middle" fontSize="10.5" fill={sub}>{label}</text>
            </g>
          );
        })}

        {TABLES.map((t) => {
          const h = nodeH(t);
          const p = pos[t.id];
          return (
            <g
              key={t.id}
              transform={`translate(${p.x},${p.y})`}
              onPointerDown={onNodeDown(t.id)}
              style={{ cursor: 'grab', touchAction: 'none' }}
            >
              <title>Drag to move {t.title}</title>
              <rect width={W} height={h} rx={corner} fill={fill} stroke={stroke} strokeWidth="1.5" />
              {classic ? (
                <line x1={0} y1={HEAD_H} x2={W} y2={HEAD_H} stroke={stroke} strokeWidth="1.5" />
              ) : (
                <g>
                  <rect width={W} height={HEAD_H} rx={corner} fill={headFill} />
                  <rect y={HEAD_H - 12} width={W} height={12} fill={headFill} stroke="none" />
                </g>
              )}
              <text x={12} y={22} fontSize="13" fontWeight="700" fill={text} fontFamily="ui-monospace, monospace">{t.title}</text>
              <text x={W - 12} y={22} textAnchor="end" fontSize="11" fill={sub}>⠿</text>
              {t.fields.map(([f, kind], j) => (
                <text
                  key={j}
                  x={12}
                  y={HEAD_H + 15 + j * ROW_H}
                  fontSize="10.5"
                  fontFamily="ui-monospace, monospace"
                  fontWeight={kind === 'pk' ? 700 : 400}
                  fill={kind === 'fk' ? fkColor : kind === 'pk' || kind === 'uk' ? text : sub}
                >
                  {f}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
      <div
        onPointerDown={onGripDown}
        title="Drag to resize the playground"
        className="absolute bottom-1 right-1 flex h-8 w-8 cursor-nwse-resize items-center justify-center rounded-lg border border-line bg-surface text-muted shadow-card transition-colors hover:text-brand"
      >
        <Scaling className="h-4 w-4" />
      </div>
      </div>
    </div>
  );
}
