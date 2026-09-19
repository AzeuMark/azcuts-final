import { Link } from 'react-router-dom';
import { Scissors, Briefcase, Crown, Network, Database, TriangleAlert } from 'lucide-react';
import GuideLayout from '../GuideLayout';
import { DemoAccounts, BackLinks } from '../FeatureCard';
import { DEMO_ACCOUNTS } from '../data';

const CARDS = [
  { to: '/guide/customer', icon: Scissors, title: 'Customer tour', desc: 'Register → services → book → history. 10 paper features, each with its exact location.' },
  { to: '/guide/barber', icon: Briefcase, title: 'Barber tour', desc: 'Assigned queue → confirm → serve → record sales → update stock. 11 paper features.' },
  { to: '/guide/owner', icon: Crown, title: 'Owner tour', desc: 'Dashboard → users → catalog → assign → sales → inventory → reports. 10 paper groups.' },
  { to: '/guide/hipo-ipo', icon: Network, title: 'HIPO + IPO', desc: 'System hierarchy chart and input-process-output tables drawn from this build.' },
  { to: '/guide/database', icon: Database, title: 'Database chart', desc: 'Every collection, key field, and relationship in one ER diagram.' },
];

export default function GuideHome() {
  return (
    <GuideLayout
      title="AzCuts feature guide"
      description="Every feature from the research paper, mapped to exactly where it lives on the website. Pick a tour — each stop names the page, the clicks, and the API behind it."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.to}
              to={c.to}
              className="group rounded-2xl border border-line bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-3 font-semibold text-ink group-hover:text-brand">{c.title}</h2>
              <p className="mt-1 text-sm text-muted">{c.desc}</p>
            </Link>
          );
        })}
      </div>

      <h2 className="mb-3 mt-10 font-serif text-xl font-semibold">Demo accounts</h2>
      <DemoAccounts accounts={DEMO_ACCOUNTS} />

      <div className="mt-6 flex items-start gap-2 rounded-xl bg-warning/10 p-4 text-sm text-warning ring-1 ring-inset ring-warning/20">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Guide-only module: delete <code className="font-mono text-xs">client/src/guide/</code> (and its
          routes in <code className="font-mono text-xs">App.jsx</code>) before any real-world deploy —
          it publishes working logins and the system blueprint. See{' '}
          <code className="font-mono text-xs">guide/README.md</code>.
        </p>
      </div>

      <BackLinks links={[{ to: '/', label: 'Back to the site' }]} />
    </GuideLayout>
  );
}
