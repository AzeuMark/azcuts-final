import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { RotateCcw, Scaling } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import './Mermaid.css';
import { ERD_CHART } from './diagrams';

// Movable version of the ORIGINAL database chart. The SVG below is rendered
// by Mermaid from the exact same ERD_CHART source as the fixed section —
// zero design changes. This component only adds interaction on top:
//   - tables drag (connectors stay attached),
//   - connectors drag/stretch via grab line + midpoint dot (double-click straightens),
//   - overpass hops where lines cross,
//   - a corner grip resizes the playground.
// Untouched edges keep their original Mermaid paths pixel-for-pixel.
// Layout + bends + size persist per browser.

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
const SVGNS = 'http://www.w3.org/2000/svg';
const HOP_R = 7;

function parseTranslate(t) {
  const m = /translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/.exec(t || '');
  return m ? { x: +m[1], y: +m[2] } : { x: 0, y: 0 };
}

// Mermaid edge id format (verified): id_entity-<from>-<i>_entity-<to>-<j>_<counter>
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

const qPoint = (p0, c, p2, t) => ({
  x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * c.x + t * t * p2.x,
  y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * c.y + t * t * p2.y,
});

const cPoint = (p0, c1, c2, p3, t) => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  };
};

// Sample any M/L/Q/C path `d` into a polyline (for exact hop placement on
// Mermaid's original orthogonal/curved paths as well as our own).
function sampleD(d, per = 8) {
  const tokens = d.match(/[MLCQZmlcqz]|-?\d+(?:\.\d+)?/g) || [];
  const pts = [];
  let cur = { x: 0, y: 0 };
  let cmd = '';
  let i = 0;
  const num = () => parseFloat(tokens[i++]);
  const pt = (rel) => {
    const x = num();
    const y = num();
    return rel ? { x: cur.x + x, y: cur.y + y } : { x, y };
  };
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[MLCQZmlcqz]/.test(t)) {
      cmd = t;
      i += 1;
      if (/[Zz]/.test(cmd)) continue;
    }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'M') {
      cur = pt(rel);
      pts.push({ ...cur });
      cmd = rel ? 'l' : 'L';
    } else if (C === 'L') {
      cur = pt(rel);
      pts.push({ ...cur });
    } else if (C === 'Q') {
      const c = pt(rel);
      const p = pt(rel);
      for (let k = 1; k <= per; k += 1) pts.push(qPoint(cur, c, p, k / per));
      cur = p;
    } else if (C === 'C') {
      const c1 = pt(rel);
      const c2 = pt(rel);
      const p = pt(rel);
      for (let k = 1; k <= per; k += 1) pts.push(cPoint(cur, c1, c2, p, k / per));
      cur = p;
    } else {
      i += 1;
    }
  }
  return pts;
}

function segInt(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  if (t <= 0.001 || t >= 0.999 || u <= 0.001 || u >= 0.999) return null;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const fmt = (p) => `${Math.round(p.x * 10) / 10},${Math.round(p.y * 10) / 10}`;

export default function MovableErd() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(0);
  const wrapRef = useRef(null);
  const st = useRef(null);
  const drag = useRef(null); // { kind: 'node' | 'edge' | 'resize', ... }

  // ---- live geometry ----
  const nodeCenter = (n) => ({ x: n.x + n.lx + n.w / 2, y: n.y + n.ly + n.h / 2 });

  // Straight-line endpoints between two tables (used when we redraw a connector).
  const straightEnds = (e) => {
    const { nodes } = st.current;
    const na = nodes[e.a];
    const nb = nodes[e.b];
    const ca = nodeCenter(na);
    const cb = nodeCenter(nb);
    const dx = cb.x - ca.x;
    const dy = cb.y - ca.y;
    const len = Math.hypot(dx, dy) || 1;
    return {
      p0: clipToRect(ca, na.w, na.h, dx / len, dy / len),
      p2: clipToRect(cb, nb.w, nb.h, -dx / len, -dy / len),
    };
  };

  // Visible polyline of an edge: our bent/straight version when customized,
  // otherwise the original Mermaid path sampled exactly.
  const visiblePts = (e) => {
    if (e.bend || e.moved) {
      const { p0, p2 } = straightEnds(e);
      if (!e.bend) return [p0, p2];
      const pts = [];
      for (let i = 0; i <= 12; i += 1) pts.push(qPoint(p0, e.bend, p2, i / 12));
      return pts;
    }
    const pts = sampleD(e.path.getAttribute('d'));
    return pts.length >= 2 ? pts : [ { x: 0, y: 0 }, { x: 1, y: 1 } ];
  };

  const labelPoint = (e) => {
    if (e.bend || e.moved) {
      const { p0, p2 } = straightEnds(e);
      return e.bend ? qPoint(p0, e.bend, p2, 0.5) : { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 };
    }
    const pts = visiblePts(e);
    return pts[Math.floor(pts.length / 2)];
  };

  // Rewrite a connector after a move/bend (marks it customized).
  const applyEdge = (e) => {
    const { p0, p2 } = straightEnds(e);
    e.moved = true;
    e.path.setAttribute(
      'd',
      e.bend ? `M${fmt(p0)} Q${fmt(e.bend)} ${fmt(p2)}` : `M${fmt(p0)}L${fmt(p2)}`
    );
    const mid = labelPoint(e);
    if (e.labelOuter) {
      e.labelOuter.setAttribute(
        'transform',
        `translate(${e.labelOrig.x + (mid.x - e.origMid.x)},${e.labelOrig.y + (mid.y - e.origMid.y)})`
      );
    }
    syncOverlay(e);
  };

  // Position the grab line + dot on the edge's visible geometry (no path change).
  const syncOverlay = (e) => {
    const pts = visiblePts(e);
    const d = `M${pts.map(fmt).join('L')}`;
    if (e.hit) e.hit.setAttribute('d', d);
    if (e.dot) {
      const m = pts[Math.floor(pts.length / 2)];
      e.dot.setAttribute('cx', m.x);
      e.dot.setAttribute('cy', m.y);
    }
  };

  const mk = (tag, attrs) => {
    const n = document.createElementNS(SVGNS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  };

  const refreshHops = () => {
    const s = st.current;
    if (!s) return;
    while (s.hopsG.firstChild) s.hopsG.removeChild(s.hopsG.firstChild);
    const geos = s.edges.map((e) => {
      const pts = visiblePts(e);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      pts.forEach((p) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
      return { e, pts, bb: { x0, y0, x1, y1 } };
    });
    const drawn = [];
    const boxesHit = (a, b) => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;
    for (let i = 0; i < geos.length; i += 1) {
      for (let j = i + 1; j < geos.length; j += 1) {
        const A = geos[i];
        const B = geos[j];
        if (!boxesHit(A.bb, B.bb)) continue;
        for (let a = 0; a < A.pts.length - 1; a += 1) {
          for (let b = 0; b < B.pts.length - 1; b += 1) {
            const hit = segInt(A.pts[a], A.pts[a + 1], B.pts[b], B.pts[b + 1]);
            if (!hit) continue;
            // Skip meetings at table borders (shared endpoints), keep real crossings.
            if (dist(hit, A.pts[0]) < 14 || dist(hit, A.pts[A.pts.length - 1]) < 14) continue;
            if (dist(hit, B.pts[0]) < 14 || dist(hit, B.pts[B.pts.length - 1]) < 14) continue;
            if (drawn.some((p) => dist(p, hit) < 5)) continue;
            drawn.push(hit);
            // Overpass belongs to the later edge (B): mask + hump along its direction.
            const dd = { x: B.pts[b + 1].x - B.pts[b].x, y: B.pts[b + 1].y - B.pts[b].y };
            const len = Math.hypot(dd.x, dd.y) || 1;
            dd.x /= len; dd.y /= len;
            const n = { x: -dd.y, y: dd.x };
            const m1 = { x: hit.x - dd.x * (HOP_R + 4), y: hit.y - dd.y * (HOP_R + 4) };
            const m2 = { x: hit.x + dd.x * (HOP_R + 4), y: hit.y + dd.y * (HOP_R + 4) };
            const a1 = { x: hit.x - dd.x * HOP_R, y: hit.y - dd.y * HOP_R };
            const a2 = { x: hit.x + dd.x * HOP_R, y: hit.y + dd.y * HOP_R };
            const top = { x: hit.x + n.x * (HOP_R + 2), y: hit.y + n.y * (HOP_R + 2) };
            s.hopsG.appendChild(mk('line', {
              x1: m1.x, y1: m1.y, x2: m2.x, y2: m2.y,
              stroke: s.bg, 'stroke-width': s.edgeWidth + 7, 'stroke-linecap': 'round',
            }));
            s.hopsG.appendChild(mk('path', {
              d: `M${fmt(a1)} Q${fmt(top)} ${fmt(a2)}`,
              fill: 'none', stroke: s.edgeColor, 'stroke-width': s.edgeWidth, 'stroke-linecap': 'round',
            }));
          }
        }
      }
    }
  };

  const refreshAllEdges = () => {
    const s = st.current;
    if (!s) return;
    s.edges.forEach(applyEdge);
    refreshHops();
  };

  const clearHops = () => {
    const s = st.current;
    if (!s) return;
    while (s.hopsG.firstChild) s.hopsG.removeChild(s.hopsG.firstChild);
  };

  const growViewBox = () => {
    const s = st.current;
    if (!s) return;
    let minX = s.box.x;
    let minY = s.box.y;
    let maxX = s.box.x + s.box.w;
    let maxY = s.box.y + s.box.h;
    Object.values(s.nodes).forEach((n) => {
      minX = Math.min(minX, n.x + n.lx);
      minY = Math.min(minY, n.y + n.ly);
      maxX = Math.max(maxX, n.x + n.lx + n.w);
      maxY = Math.max(maxY, n.y + n.ly + n.h);
    });
    const pad = 60;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    s.box = {
      x: Math.min(s.box.x, minX),
      y: Math.min(s.box.y, minY),
      w: Math.max(s.boxW0 || 0, maxX - Math.min(s.box.x, minX)),
      h: Math.max(s.boxH0 || 0, maxY - Math.min(s.box.y, minY)),
    };
    s.svgEl.setAttribute('viewBox', `${s.box.x} ${s.box.y} ${s.box.w} ${s.box.h}`);
  };

  const persist = () => {
    const s = st.current;
    if (!s) return;
    try {
      const nodes = {};
      Object.entries(s.nodes).forEach(([name, n]) => { nodes[name] = { x: n.x, y: n.y }; });
      const bends = {};
      s.edges.forEach((e) => { if (e.bend) bends[e.id] = e.bend; });
      localStorage.setItem(POS_KEY, JSON.stringify({ v: 2, nodes, bends, box: s.box }));
    } catch { /* private mode */ }
  };

  // ---- render the original chart (identical init to Mermaid.jsx) ----
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

  // ---- index Mermaid's DOM and wire interaction (no visual changes) ----
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
        const groups = [...svgEl.querySelectorAll('g.nodes > g')];
        for (const name of ENTITIES) {
          let g = groups.find((elm) => entityFromNodeId(elm.getAttribute('id')) === name);
          if (!g) g = groups.find((elm) => (elm.textContent || '').trim().startsWith(name));
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
        const eid = p.getAttribute('data-id');
        const parsed = parseEdgeId(eid);
        if (!parsed || !nodes[parsed.a] || !nodes[parsed.b]) return;
        const d = p.getAttribute('d');
        const pts = endpointsOf(d);
        if (!pts) return;
        const labelOuter = labelById[eid] || null;
        edges.push({
          id: eid, a: parsed.a, b: parsed.b, path: p, origD: d,
          bend: null, moved: false, hit: null, dot: null,
          labelOuter,
          labelOrig: labelOuter ? parseTranslate(labelOuter.getAttribute('transform')) : null,
          origMid: { x: (pts.sx + pts.ex) / 2, y: (pts.sy + pts.ey) / 2 },
        });
      });

      // Sample the original connector style for overlay pieces (hops, dots).
      let edgeColor = '#0EA5E9';
      let edgeWidth = 2;
      try {
        const cs = window.getComputedStyle(edges[0].path);
        if (cs.stroke && cs.stroke !== 'none') edgeColor = cs.stroke;
        const w = parseFloat(cs.strokeWidth);
        if (Number.isFinite(w) && w > 0) edgeWidth = w;
      } catch { /* fallbacks */ }

      const vb = svgEl.viewBox.baseVal;
      const nodesG = svgEl.querySelector('g.nodes');
      const hopsG = document.createElementNS(SVGNS, 'g');
      hopsG.setAttribute('id', 'merd-hops');
      hopsG.style.pointerEvents = 'none';
      const handlesG = document.createElementNS(SVGNS, 'g');
      handlesG.setAttribute('id', 'merd-handles');
      svgEl.insertBefore(hopsG, nodesG);
      svgEl.insertBefore(handlesG, nodesG);

      st.current = {
        svgEl, nodes, edges, hopsG, handlesG, edgeColor, edgeWidth,
        bg: dark ? '#171A21' : '#FFFFFF',
        box: { x: vb.x, y: vb.y, w: vb.width, h: vb.height },
        boxW0: vb.width, boxH0: vb.height,
        origViewBox: svgEl.getAttribute('viewBox'),
      };

      // Per-edge grab line + midpoint dot (drawn in the connector's own style).
      edges.forEach((e) => {
        const hit = document.createElementNS(SVGNS, 'path');
        hit.setAttribute('stroke', 'rgba(0,0,0,0)');
        hit.setAttribute('stroke-width', '16');
        hit.setAttribute('fill', 'none');
        hit.style.pointerEvents = 'stroke';
        hit.style.cursor = 'grab';
        hit.innerHTML = '<title>Drag to reroute this line</title>';
        hit.onpointerdown = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const pt = toSvgPt(ev);
          if (!e.bend) e.bend = { x: Math.round(pt.x), y: Math.round(pt.y) };
          drag.current = { kind: 'edge', id: e.id };
          hit.style.cursor = 'grabbing';
        };
        const dot = document.createElementNS(SVGNS, 'circle');
        dot.setAttribute('r', '6');
        dot.setAttribute('fill', st.current.bg);
        dot.setAttribute('stroke', edgeColor);
        dot.setAttribute('stroke-width', '2');
        dot.style.cursor = 'grab';
        dot.style.opacity = '0.45';
        dot.innerHTML = '<title>Drag to reroute · double-click to straighten</title>';
        dot.onpointerdown = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          drag.current = { kind: 'edge', id: e.id };
          dot.style.cursor = 'grabbing';
        };
        dot.ondblclick = (ev) => {
          ev.stopPropagation();
          e.bend = null;
          applyEdge(e);
          refreshHops();
          persist();
        };
        dot.onpointerenter = () => { dot.style.opacity = '1'; };
        dot.onpointerleave = () => { if (!drag.current) dot.style.opacity = '0.45'; };
        handlesG.appendChild(hit);
        handlesG.appendChild(dot);
        e.hit = hit;
        e.dot = dot;
        syncOverlay(e);
      });

      Object.entries(nodes).forEach(([name, n]) => {
        n.g.style.cursor = 'grab';
        n.g.style.touchAction = 'none';
        n.g.onpointerdown = (e) => {
          e.preventDefault();
          const s = st.current;
          if (!s) return;
          const pt = toSvgPt(e);
          drag.current = { kind: 'node', name, sx: pt.x, sy: pt.y, ox: s.nodes[name].x, oy: s.nodes[name].y };
          n.g.style.cursor = 'grabbing';
        };
      });

      // Restore the saved layout (v2) or legacy node positions (v1).
      try {
        const raw = localStorage.getItem(POS_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          const savedNodes = saved.v === 2 ? saved.nodes : saved;
          Object.entries(savedNodes || {}).forEach(([name, p]) => {
            const n = st.current.nodes[name];
            if (!n || typeof p.x !== 'number' || typeof p.y !== 'number') return;
            n.x = p.x; n.y = p.y;
            n.g.setAttribute('transform', `translate(${p.x},${p.y})`);
          });
          if (saved.v === 2) {
            Object.entries(saved.bends || {}).forEach(([eid, b]) => {
              const e = st.current.edges.find((x) => x.id === eid);
              if (e && b && typeof b.x === 'number') e.bend = b;
            });
            if (saved.box && saved.box.w >= 400) st.current.box = { ...saved.box };
          }
          refreshAllEdges();
          growViewBox();
          persist();
        }
      } catch { /* start fresh */ }
      setReady(Object.keys(nodes).length);
    };
    raf = requestAnimationFrame(setup);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg]);

  // ---- global move/up handlers (registered once) ----
  useEffect(() => {
    const move = (e) => {
      const d = drag.current;
      const s = st.current;
      if (!d || !s) return;
      const pt = toSvgPt(e);
      if (d.kind === 'node') {
        const n = s.nodes[d.name];
        n.x = Math.round(d.ox + (pt.x - d.sx));
        n.y = Math.round(d.oy + (pt.y - d.sy));
        n.g.setAttribute('transform', `translate(${n.x},${n.y})`);
        s.edges.forEach((edge) => { if (edge.a === d.name || edge.b === d.name) applyEdge(edge); });
        refreshHops();
        growViewBox();
      } else if (d.kind === 'edge') {
        const edge = s.edges.find((x) => x.id === d.id);
        if (!edge) return;
        edge.bend = {
          x: Math.round(Math.min(s.box.x + s.box.w, Math.max(s.box.x, pt.x))),
          y: Math.round(Math.min(s.box.y + s.box.h, Math.max(s.box.y, pt.y))),
        };
        applyEdge(edge);
        refreshHops();
      } else if (d.kind === 'resize') {
        const w = Math.min(2400, Math.max(500, Math.round(d.w0 + (e.clientX - d.sx) * d.scaleX)));
        const h = Math.min(1600, Math.max(350, Math.round(d.h0 + (e.clientY - d.sy) * d.scaleY)));
        s.box = { ...s.box, w, h };
        s.boxW0 = w;
        s.boxH0 = h;
        growViewBox();
      }
    };
    const up = () => {
      if (!drag.current || !st.current) return;
      if (drag.current.kind === 'node') {
        const n = st.current.nodes[drag.current.name];
        if (n) n.g.style.cursor = 'grab';
      }
      if (drag.current.kind === 'edge') {
        const edge = st.current.edges.find((x) => x.id === drag.current.id);
        if (edge) {
          if (edge.hit) edge.hit.style.cursor = 'grab';
          if (edge.dot) { edge.dot.style.cursor = 'grab'; edge.dot.style.opacity = '0.45'; }
        }
      }
      persist();
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

  const onGripDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const s = st.current;
    if (!s) return;
    const r = wrapRef.current?.querySelector('svg')?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    drag.current = {
      kind: 'resize',
      sx: e.clientX, sy: e.clientY,
      w0: s.box.w, h0: s.box.h,
      scaleX: s.box.w / r.width, scaleY: s.box.h / r.height,
    };
  };

  const reset = () => {
    const s = st.current;
    if (!s) return;
    try { localStorage.removeItem(POS_KEY); } catch { /* ignore */ }
    Object.values(s.nodes).forEach((n) => {
      n.x = n.origX; n.y = n.origY;
      n.g.setAttribute('transform', `translate(${n.origX},${n.origY})`);
    });
    s.edges.forEach((e) => {
      e.bend = null;
      e.moved = false;
      e.path.setAttribute('d', e.origD);
      if (e.labelOuter) e.labelOuter.setAttribute('transform', `translate(${e.labelOrig.x},${e.labelOrig.y})`);
      syncOverlay(e);
    });
    if (s.origViewBox) {
      s.svgEl.setAttribute('viewBox', s.origViewBox);
      const vb = s.svgEl.viewBox.baseVal;
      s.box = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
      s.boxW0 = vb.width;
      s.boxH0 = vb.height;
    }
    clearHops();
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {ready
            ? `Drag tables to move · drag a line/dot to reroute · double-click a dot to straighten (${ready}/8 ready).`
            : 'Preparing the movable chart…'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-brand"
        >
          <RotateCcw className="h-4 w-4" /> Reset layout
        </button>
      </div>
      <div className="relative">
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
            Original design, movable tables and lines — crossings hop over each other
          </figcaption>
        </figure>
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
