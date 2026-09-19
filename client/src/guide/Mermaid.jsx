import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from '../hooks/useTheme';
import './Mermaid.css';

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

// Render a mermaid diagram string to SVG. Re-initialized per theme so charts
// stay readable in both light and dark mode. Code-split with the guide
// routes, so the main app never downloads mermaid.
export default function Mermaid({ chart, caption }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setSvg('');
    setError('');
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      fontFamily: 'Inter, system-ui, sans-serif',
      themeVariables: dark ? DARK_VARS : LIGHT_VARS,
      flowchart: { curve: 'linear', padding: 12 },
      er: { layoutDirection: 'TB' },
    });
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
  }, [chart, id, dark]);

  return (
    <figure
      className={`mmd overflow-x-auto rounded-2xl border border-line bg-surface p-4 shadow-card ${
        dark ? 'mmd-dark' : 'mmd-light'
      }`}
    >
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : (
        <div
          className="[&>svg]:h-auto [&>svg]:max-w-full [&>svg]:bg-transparent"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      {caption && <figcaption className="mt-3 text-center text-xs text-muted">{caption}</figcaption>}
    </figure>
  );
}
