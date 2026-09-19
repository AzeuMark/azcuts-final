import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';

let initialized = false;
function ensureInit() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#E11D48',
      primaryTextColor: '#fff',
      primaryBorderColor: '#BE123C',
      lineColor: '#0EA5E9',
      secondaryColor: '#0EA5E9',
      tertiaryColor: '#F7F8FA',
      background: '#FFFFFF',
      mainBkg: '#FFFFFF',
      nodeBorder: '#0EA5E9',
    },
    flowchart: { curve: 'linear', padding: 12 },
    er: { layoutDirection: 'TB' },
  });
  initialized = true;
}

// Render a mermaid diagram string to SVG. Code-split with the guide routes,
// so the main app never downloads mermaid.
export default function Mermaid({ chart, caption }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    ensureInit();
    mermaid
      .render(`mmd-${id}`, chart)
      .then(({ svg: out }) => {
        if (!cancelled) setSvg(out);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Could not render diagram');
      });
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  return (
    <figure className="overflow-x-auto rounded-2xl border border-line bg-surface p-4 shadow-card">
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      )}
      {caption && <figcaption className="mt-3 text-center text-xs text-muted">{caption}</figcaption>}
    </figure>
  );
}
