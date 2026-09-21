import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { RotateCcw } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import './Mermaid.css';
import { ERD_CHART } from './diagrams';

// Movable version of the ORIGINAL database chart. The SVG below is rendered
// by Mermaid from the exact same ERD_CHART source as the fixed section —
// zero design changes. This component only adds pointer-drag on the entity
// groups and redraws the touched connectors (same stroke, same crows-foot
// markers, same labels) so they stay attached. Untouched edges keep their
// original Mermaid paths pixel-for-pixel. Positions persist per browser.

const ENTITIES = [
  'users', 'services', 'appointments', 'sales',
  'products', 'inventory', 'settings', 'refreshtokens',
];

const LIGHT_VARS = {
  primaryColor: '#E11D48',
  primaryTextColor: '#fff',
  primaryBorderColor: '#BE123C',
  lineColor: '#0EA5E9',
  secondaryColor: '#0EA5E9',
  tertiaryColor: '#F7F8FA',
  background: '#FFFFFF',
  mainBkg: '#FFFFFF',
  nodeBorder: '#0EA5E9',
};

const DARK_VARS = {
  darkMode: true,
  primaryColor: '#E11D48',
  primaryTextColor: '#fff',
  primaryBorderColor: '#BE123C',
  lineColor: '#0EA5E9',
  secondaryColor: '#0EA5E9',
  tertiaryColor: '#232733',
  tertiaryTextColor: '#F3F4F6',
  secondaryTextColor: '#F3F4F6',
  textColor: '#F3F4F6',
  nodeTextColor: '#F3F4F6',
  background: '#171A21',
  mainBkg: '#171A21',
  nodeBorder: '#0EA5E9',
};

const POS_KEY = 'az-merd-pos';

function parseTranslate(t) {
  const m = /translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/.exec(t || '');
  return m ? { x: +m[1], y: +m[2] } : { x: 0, y: 0 };
}

// Mermaid edge id format (verified against rendered output):
//   id_entity-<from>-<i>_entity-<to>-<j>_<counter>
function parseEdgeId(id) {
  const m = /^id_entity-(.+?)-\d+_entity-(.+?)-\d+_\d+$/.exec(id || '');
  return m ? { a: m[1], b: m[2] } : null;
}

// Node group id format: <renderId>-entity-<name>-<index>
function entityFromNodeId(id) {
  const m = /-entity-(.+?)-\d+$/.exec(id || '');
  return m ? m[1] : null;
}

// First (M) and last coordinate pairs of a path `d` string.
function endpointsOf(d) {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  if (nums.length < 4) return null;
  return { sx: nums[0], sy: nums[1], ex: nums[nums.length - 2], ey: nums[nums.length - 1] };
}

function clipToRect(c, w, h, dx, dy) {
  const tx = dx === 0 ? Infinity : w / 2 / Math.abs(dx);
  const ty = dy === 0 ? Infinity : h / 2 / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

export default function MovableErd() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(0);
  const wrapRef = useRef(null);
  const st = useRef(null); // { svgEl, nodes, edges, origViewBox }
  const drag = useRef(null);

  // 1. Render the original chart (identical init to Mermaid.jsx).
  useEffect(() => {
    let cancelled = false;
    setSvg('');
    setError('');
    setReady(0);
    st.current = null;
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      fontFamily: 'Inter, system-ui, sans-serif',
      themeVariables: dark ? DARK_VARS : LIGHT_VARS,
      flowchart: { curve: 'linear', padding: 12 },
      er: { layoutDirection: 'TB' },
    });
    mermaid
      .render(`merd-${id}`, ERD_CHART)
      .then(({ svg: out }) => { if (!cancelled) setSvg(out); })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Could not render diagram'); });
    return () => { cancelled = true; };
  }, [id, dark]);

  const toSvgPt = (e) => {
    const svgEl = st.current?.svgEl;
    if (!svgEl) return { x: 0, y: 0 };
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const worldCenter = (name) => {
    const n = st.current.nodes[name];
    return { x: n.x + n.lx + n.w / 2, y: n.y + n.ly + n.h / 2 };
  };

  const relayoutEdge = (e) => {
    const { nodes } = st.current;
    const na = nodes[e.a];
    const nb = nodes[e.b];
    const ca = worldCenter(e.a);
    const cb = worldCenter(e.b);
    const dx = cb.x - ca.x;
    const dy = cb.y - ca.y;
    const len = Math.hypot(dx, dy) || 1;
    const p0 = clipToRect(ca, na.w, na.h, dx / len, dy / len);
    const p2 = clipToRect(cb, nb.w, nb.h, -dx / len, -dy / len);
    e.path.setAttribute('d', `M${p0.x},${p0.y}L${p2.x},${p2.y}`);
    if (e.labelOuter) {
      const mx = (p0.x + p2.x) / 2;
      const my = (p0.y + p2.y) / 2;
      e.labelOuter.setAttribute(
        'transform',
        `translate(${e.labelOrig.x + (mx - e.origMid.x)},${e.labelOrig.y + (my - e.origMid.y)})`
      );
    }
  };

  const growViewBox = () => {
    const { svgEl, nodes } = st.current;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Object.values(nodes).forEach((n) => {
      minX = Math.min(minX, n.x + n.lx);
      minY = Math.min(minY, n.y + n.ly);
      maxX = Math.max(maxX, n.x + n.lx + n.w);
      maxY = Math.max(maxY, n.y + n.ly + n.h);
    });
    const pad = 60;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const vb = svgEl.viewBox.baseVal;
    let { x, y, width, height } = { x: vb.x, y: vb.y, width: vb.width, height: vb.height };
    if (minX < x) { width += x - minX; x = minX; }
    if (minY < y) { height += y - minY; y = minY; }
    if (maxX > x + width) width = maxX - x;
    if (maxY > y + height) height = maxY - y;
    svgEl.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  };

  // 2. Index Mermaid's DOM and wire drag (no visual changes here).
  useEffect(() => {
    if (!svg) return;
    let frames = 0;
    let raf = 0;
    const setup = () => {
      frames += 1;
      const svgEl = wrapRef.current?.querySelector('svg');
      if (!svgEl) { if (frames < 30) raf = requestAnimationFrame(setup); return; }
      let nodes = null;
      let nodeError = '';
      try {
        nodes = {};
        for (const name of ENTITIES) {
          // Primary: the group's own id ends with -entity-<name>-<n>.
          const groups = [...svgEl.querySelectorAll('g.nodes > g')];
          let g = groups.find((el) => entityFromNodeId(el.getAttribute('id')) === name);
          // Fallback: label text starts with the entity name (no \b — the
          // attribute text runs on directly, e.g. "usersObjectId…").
          if (!g) g = groups.find((el) => (el.textContent || '').trim().startsWith(name));
          if (!g) { nodes = null; nodeError = `table not found: ${name}`; break; }
          const bbox = g.getBBox();
          const tr = parseTranslate(g.getAttribute('transform'));
          nodes[name] = { g, lx: bbox.x, ly: bbox.y, w: bbox.width, h: bbox.height, x: tr.x, y: tr.y, origX: tr.x, origY: tr.y };
        }
      } catch (err) {
        nodes = null;
        nodeError = err?.message || 'measurement failed';
      }
      if (!nodes) {
        if (frames < 30) { raf = requestAnimationFrame(setup); return; }
        setError(`Could not make tables movable (${nodeError}). The fixed chart above is unaffected.`);
        return;
      }

      const labelById = {};
      svgEl.querySelectorAll('g.edgeLabels > g.edgeLabel').forEach((o) => {
        const inner = o.querySelector('g.label[data-id]');
        if (inner) labelById[inner.getAttribute('data-id')] = o;
      });
      const edges = [];
      svgEl.querySelectorAll('g.edgePaths path[data-et="edge"]').forEach((p) => {
        const parsed = parseEdgeId(p.getAttribute('data-id'));
        if (!parsed || !nodes[parsed.a] || !nodes[parsed.b]) return;
        const d = p.getAttribute('d');
        const pts = endpointsOf(d);
        if (!pts) return;
        const eid = p.getAttribute('data-id');
        const labelOuter = labelById[eid] || null;
        edges.push({
          a: parsed.a, b: parsed.b, path: p, origD: d, labelOuter,
          labelOrig: labelOuter ? parseTranslate(labelOuter.getAttribute('transform')) : null,
          origMid: { x: (pts.sx + pts.ex) / 2, y: (pts.sy + pts.ey) / 2 },
        });
      });

      st.current = { svgEl, nodes, edges, origViewBox: svgEl.getAttribute('viewBox') };
      Object.entries(nodes).forEach(([name, n]) => {
        n.g.style.cursor = 'grab';
        n.g.style.touchAction = 'none';
        n.g.onpointerdown = (e) => {
          e.preventDefault();
          const s = st.current;
          if (!s) return;
          const pt = toSvgPt(e);
          drag.current = { name, sx: pt.x, sy: pt.y, ox: s.nodes[name].x, oy: s.nodes[name].y };
          n.g.style.cursor = 'grabbing';
        };
      });

      // Re-apply the saved layout, if any.
      try {
        const raw = localStorage.getItem(POS_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          Object.entries(saved).forEach(([name, p]) => {
            const n = st.current.nodes[name];
            if (!n || typeof p.x !== 'number' || typeof p.y !== 'number') return;
            n.x = p.x; n.y = p.y;
            n.g.setAttribute('transform', `translate(${p.x},${p.y})`);
          });
          st.current.edges.forEach(relayoutEdge);
          growViewBox();
        }
      } catch { /* start fresh */ }
      setReady(Object.keys(nodes).length);
    };
    raf = requestAnimationFrame(setup);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg]);

  // 3. Global move/up handlers (registered once).
  useEffect(() => {
    const move = (e) => {
      const d = drag.current;
      const s = st.current;
      if (!d || !s) return;
      const pt = toSvgPt(e);
      const n = s.nodes[d.name];
      n.x = Math.round(d.ox + (pt.x - d.sx));
      n.y = Math.round(d.oy + (pt.y - d.sy));
      n.g.setAttribute('transform', `translate(${n.x},${n.y})`);
      s.edges.forEach((edge) => { if (edge.a === d.name || edge.b === d.name) relayoutEdge(edge); });
      growViewBox();
    };
    const up = () => {
      if (!drag.current || !st.current) return;
      const n = st.current.nodes[drag.current.name];
      if (n) n.g.style.cursor = 'grab';
      try {
        const saved = {};
        Object.entries(st.current.nodes).forEach(([name, node]) => { saved[name] = { x: node.x, y: node.y }; });
        localStorage.setItem(POS_KEY, JSON.stringify(saved));
      } catch { /* private mode */ }
      drag.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    const s = st.current;
    if (!s) return;
    try { localStorage.removeItem(POS_KEY); } catch { /* ignore */ }
    Object.values(s.nodes).forEach((n) => {
      n.x = n.origX; n.y = n.origY;
      n.g.setAttribute('transform', `translate(${n.origX},${n.origY})`);
    });
    s.edges.forEach((e) => {
      e.path.setAttribute('d', e.origD);
      if (e.labelOuter) e.labelOuter.setAttribute('transform', `translate(${e.labelOrig.x},${e.labelOrig.y})`);
    });
    if (s.origViewBox) s.svgEl.setAttribute('viewBox', s.origViewBox);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {ready ? `Drag any table — its arrows follow without breaking (${ready}/8 ready).` : 'Preparing the movable chart…'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-brand"
        >
          <RotateCcw className="h-4 w-4" /> Reset layout
        </button>
      </div>
      <figure
        className={`mmd overflow-x-auto rounded-2xl border border-line bg-surface p-4 shadow-card ${
          dark ? 'mmd-dark' : 'mmd-light'
        }`}
      >
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : (
          <div
            ref={wrapRef}
            className="[&>svg]:h-auto [&>svg]:max-w-full [&>svg]:bg-transparent"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
        <figcaption className="mt-3 text-center text-xs text-muted">
          Original design, movable tables — drag any table, its connections follow
        </figcaption>
      </figure>
    </div>
  );
}
