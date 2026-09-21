import GuideLayout from '../GuideLayout';
import ErdCanvas from '../ErdCanvas';
import { BackLinks } from '../FeatureCard';

const NOTES = [
  ['sales', 'The paper ERD collection. One row per transaction (SL-…); service lines are auto-created when a booking finishes, product lines decrement stock.'],
  ['products + inventory', 'The paper Product + Inventory collections. products holds the live level; inventory is the append-only movement ledger (every change has an actor + reason).'],
  ['appointments.saleId', 'Traceability link: a finished booking points at the sale it generated.'],
  ['users.canUpdateStock', 'Per-barber grant for the paper rule "update stock when authorized".'],
  ['settings (singleton)', 'Shop config: hours, timezone, tax, nicknames, shop info. One document (_id "system"). No FK links — it floats alone.'],
  ['refreshtokens + counters', 'Infrastructure, not in the paper: hashed login sessions and the atomic SL-/AZ- number sequences.'],
  ['extras (not charted)', 'Kept in the database but disabled in school mode — no lines connect to it.'],
];

export default function DatabaseChart() {
  return (
    <GuideLayout
      title="Database chart — all collections"
      description="MongoDB azeubarbersalondb. The six paper collections lead; infrastructure tables are labeled as such. Drag the tables around — every relationship line, label, and cardinality follows."
    >
      <figure className="overflow-x-auto rounded-2xl border border-line bg-surface p-4 shadow-card">
        <div className="min-w-[760px]">
          <ErdCanvas />
        </div>
        <figcaption className="mt-3 text-center text-xs text-muted">
          Entity-relationship diagram of the live database — interactive, layout saved per browser
        </figcaption>
      </figure>

      <h2 className="mb-3 mt-10 font-serif text-xl font-semibold">Reading notes</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {NOTES.map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <h3 className="font-mono text-sm font-semibold text-brand">{title}</h3>
            <p className="mt-1 text-sm text-ink/80">{body}</p>
          </div>
        ))}
      </div>

      <BackLinks
        links={[
          { to: '/guide/hipo-ipo', label: 'HIPO + IPO' },
          { to: '/guide/system-design', label: 'System Design' },
          { to: '/guide', label: 'Guide start' },
        ]}
      />
    </GuideLayout>
  );
}
