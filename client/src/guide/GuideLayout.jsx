import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen, Scissors, Briefcase, Crown, Network, Database } from 'lucide-react';
import cn from '../utils/cn';

const TABS = [
  { to: '/guide', label: 'Start', icon: BookOpen, exact: true },
  { to: '/guide/customer', label: 'Customer', icon: Scissors },
  { to: '/guide/barber', label: 'Barber', icon: Briefcase },
  { to: '/guide/owner', label: 'Owner', icon: Crown },
  { to: '/guide/hipo-ipo', label: 'HIPO + IPO', icon: Network },
  { to: '/guide/database', label: 'Database', icon: Database },
];

// Standalone public shell for the classmate guide (GUIDE-ONLY, not the app shell).
export default function GuideLayout({ title, description, children }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-app text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Link to="/" className="mr-2 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand">
            <ArrowLeft className="h-4 w-4" />
            Site
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {TABS.map((t) => {
              const active = t.exact ? pathname === t.to : pathname === t.to;
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    active ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">Classmate guide</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-muted">{description}</p>}
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
