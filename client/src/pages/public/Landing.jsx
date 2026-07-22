import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Clock, Star } from 'lucide-react';
import PublicNavbar from '../../components/layout/PublicNavbar';
import { buttonVariants } from '../../components/ui/Button';

const HIGHLIGHTS = [
  { icon: CalendarCheck, title: 'Real-time slots', desc: 'Open times already account for the extras you pick.' },
  { icon: Clock, title: 'No waiting around', desc: 'Auto-matched to the least-busy barber on shift.' },
  { icon: Star, title: 'Rate your cut', desc: 'Leave a rating and keep track of your favorites.' },
];

// Provisional Phase 0 hero. The full landing (services gallery, about, contact,
// location, imagery) is built in Phase 2 with the brand register.
export default function Landing() {
  return (
    <div className="min-h-screen bg-app">
      <PublicNavbar />
      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-80 max-w-4xl rounded-full bg-brand/20 blur-3xl"
          />
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                Barber shop &amp; salon
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Sharp looks, <span className="text-brand">effortless</span> booking.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">
                Book your next haircut or salon service in seconds. Pick your barber, or let us
                match you with the next available one.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/register" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
                  Book now
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/login" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                  Log in
                </Link>
              </div>
            </div>

            <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
              {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-sm font-semibold text-ink">{title}</h2>
                  <p className="mt-1 text-sm text-muted">{desc}</p>
                </div>
              ))}
            </div>

            <p className="mt-16 text-center text-sm text-muted">
              Full services gallery, about, contact, and location arrive in the next build phase.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
