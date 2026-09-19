import GuideLayout from '../GuideLayout';
import Mermaid from '../Mermaid';
import { BackLinks } from '../FeatureCard';
import { HIPO_CHART, IPO_ROWS } from '../diagrams';

export default function HipoIpo() {
  return (
    <GuideLayout
      title="HIPO + IPO — drawn from this build"
      description="The hierarchy (HIPO) shows what the system contains per role; the IPO tables show what flows through the six core processes. Both reflect school mode: service-only booking, manual owner assign, live sales + inventory."
    >
      <h2 className="mb-3 font-serif text-xl font-semibold">Hierarchy (HIPO)</h2>
      <Mermaid chart={HIPO_CHART} caption="AzCuts hierarchy: 3 portals → modules → functions" />

      <h2 className="mb-3 mt-10 font-serif text-xl font-semibold">Input – Process – Output</h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-3">Process</th>
              <th className="px-4 py-3">Input</th>
              <th className="px-4 py-3">Process</th>
              <th className="px-4 py-3">Output</th>
            </tr>
          </thead>
          <tbody>
            {IPO_ROWS.map((r) => (
              <tr key={r.process} className="border-b border-line align-top last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{r.process}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{r.input}</td>
                <td className="px-4 py-3 text-ink/80">{r.proc}</td>
                <td className="px-4 py-3 text-ink/80">{r.output}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BackLinks
        links={[
          { to: '/guide/database', label: 'Database chart' },
          { to: '/guide', label: 'Guide start' },
        ]}
      />
    </GuideLayout>
  );
}
