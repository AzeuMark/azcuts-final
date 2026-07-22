import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  Star,
  Mail,
  Phone,
  MapPin,
  ScissorsLineDashed,
} from 'lucide-react';
import PublicNavbar from '../../components/layout/PublicNavbar';
import ServiceCard from '../../components/ServiceCard';
import { Tabs } from '../../components/ui/Tabs';
import Skeleton from '../../components/ui/Skeleton';
import { buttonVariants } from '../../components/ui/Button';
import { useSettingsPublic } from '../../hooks/useSettingsPublic';
import { useAuth } from '../../hooks/useAuth';
import { formatClock } from '../../utils/datetime';

const HOME_BY_ROLE = { user: '/app/book', staff: '/staff', admin: '/admin' };

const HIGHLIGHTS = [
  { icon: CalendarCheck, title: 'Real-time slots', desc: 'Open times already account for the extras you pick.' },
  { icon: Clock, title: 'No waiting around', desc: 'Auto-matched to the least-busy barber on shift.' },
  { icon: Star, title: 'Rate your cut', desc: 'Leave a rating and keep track of your favorites.' },
];

const TEAM = [
  { name: 'Uelmark G. Valdehueza', role: 'Head Developer' },
  { name: 'JM Nikko O. Gallardo', role: 'Assistant Developer' },
  { name: 'Lara Angel A. Habagat', role: 'Assistant Developer' },
];

const DAYS = [
  ['mon', 'Monday'],
  ['tue', 'Tuesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sun', 'Sunday'],
];

const todayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

export default function Landing() {
  const { data, isLoading } = useSettingsPublic();
  const { isAuthenticated, role } = useAuth();
  const [category, setCategory] = useState('all');

  const bookHref = isAuthenticated ? HOME_BY_ROLE[role] || '/app/book' : '/register';

  const shop = data?.shopInfo || {};
  const currency = data?.currency || 'PHP';
  const services = data?.services || [];
  const storeHours = data?.storeHours || {};
  const socials = shop.socials || {};

  const filtered = useMemo(
    () => (category === 'all' ? services : services.filter((s) => s.category === category)),
    [services, category]
  );

  return (
    <div className="min-h-screen bg-app">
      <PublicNavbar />

      {data?.systemMode && data.systemMode !== 'online' && (
        <div className="bg-warning/10 px-4 py-2 text-center text-sm text-warning">
          We&apos;re currently in {data.systemMode} mode. Booking may be temporarily unavailable.
        </div>
      )}

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-48 mx-auto h-96 max-w-5xl rounded-full bg-brand/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-40 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
          />
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <img
                src="/assets/website-logo.png"
                alt="AzCuts"
                className="mx-auto mb-8 h-16 w-16 rounded-2xl object-contain shadow-card"
              />
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                {shop.tagline || 'Barber shop & salon'}
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Sharp looks, <span className="text-brand">effortless</span> booking.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">
                Book your next haircut or salon service in seconds. Pick your barber, or let us
                match you with the next available one.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to={bookHref} className={buttonVariants({ variant: 'primary', size: 'lg' })}>
                  Book now
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#services" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                  View services
                </a>
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
          </div>
        </section>

        {/* Services */}
        <section id="services" className="scroll-mt-20 border-t border-line bg-surface/40">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                  Our services
                </h2>
                <p className="mt-2 max-w-lg text-muted">
                  Barbering and salon work, priced up front. Pick one when you book.
                </p>
              </div>
              <Tabs
                value={category}
                onChange={setCategory}
                tabs={[
                  { value: 'all', label: 'All' },
                  { value: 'haircut', label: 'Haircuts' },
                  { value: 'salon', label: 'Salon' },
                ]}
              />
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
                      <Skeleton className="aspect-[16/10] w-full rounded-none" />
                      <div className="space-y-3 p-4">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
                    </div>
                  ))
                : filtered.map((service) => (
                    <ServiceCard key={service._id} service={service} currency={currency} />
                  ))}
            </div>

            {!isLoading && filtered.length === 0 && (
              <p className="mt-8 text-center text-sm text-muted">No services in this category yet.</p>
            )}
          </div>
        </section>

        {/* About */}
        <section id="about" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                  About AzCuts
                </h2>
                <p className="mt-4 text-muted">
                  {shop.tagline || 'Look sharp, feel sharp.'} AzCuts is a neighborhood barber shop
                  and salon that turned the front desk into an app — so you can book a chair, choose
                  your barber, and skip the waiting room.
                </p>
                <p className="mt-4 text-muted">
                  Every booking is matched to a real stylist, priced up front, and comes with a
                  receipt you can keep. No guesswork, no double-booking.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">The team</h3>
                <ul className="mt-4 space-y-3">
                  {TEAM.map((member) => (
                    <li
                      key={member.name}
                      className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                        {member.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-ink">{member.name}</p>
                        <p className="text-xs text-muted">{member.role}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Contact + Location */}
        <section id="contact" className="scroll-mt-20 border-t border-line bg-surface/40">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <div id="location" className="scroll-mt-20">
              <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Visit &amp; contact
              </h2>
              <ul className="mt-6 space-y-4 text-sm">
                {shop.address && (
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <span className="text-ink">{shop.address}</span>
                  </li>
                )}
                {shop.phone && (
                  <li className="flex items-center gap-3">
                    <Phone className="h-5 w-5 shrink-0 text-brand" />
                    <a href={`tel:${shop.phone}`} className="text-ink hover:text-brand">
                      {shop.phone}
                    </a>
                  </li>
                )}
                {shop.email && (
                  <li className="flex items-center gap-3">
                    <Mail className="h-5 w-5 shrink-0 text-brand" />
                    <a href={`mailto:${shop.email}`} className="text-ink hover:text-brand">
                      {shop.email}
                    </a>
                  </li>
                )}
              </ul>

              {Object.keys(socials).length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {Object.entries(socials).map(([name, url]) => (
                    <a
                      key={name}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm capitalize text-muted hover:text-ink"
                    >
                      {name}
                    </a>
                  ))}
                </div>
              )}

              {shop.mapEmbedUrl && (
                <div className="mt-6 overflow-hidden rounded-2xl border border-line">
                  <iframe
                    title="AzCuts location"
                    src={shop.mapEmbedUrl}
                    className="h-64 w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
                Store hours
              </h3>
              <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
                {DAYS.map(([key, label]) => {
                  const h = storeHours[key];
                  const isToday = key === todayKey;
                  return (
                    <div
                      key={key}
                      className={cnRow(isToday)}
                    >
                      <span className={isToday ? 'font-semibold text-ink' : 'text-ink'}>
                        {label}
                        {isToday && <span className="ml-2 text-xs text-brand">Today</span>}
                      </span>
                      <span className={h?.closed || !h ? 'text-muted' : 'text-ink tnum'}>
                        {h?.closed || !h ? 'Closed' : `${formatClock(h.open)} – ${formatClock(h.close)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-muted">
            <ScissorsLineDashed className="h-4 w-4 text-brand" />
            {shop.name || 'AzCuts'} · {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-4 text-sm">
            {isAuthenticated ? (
              <Link to={HOME_BY_ROLE[role] || '/app'} className="font-medium text-brand hover:underline">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-muted hover:text-ink">
                  Log in
                </Link>
                <Link to="/register" className="font-medium text-brand hover:underline">
                  Book now
                </Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function cnRow(isToday) {
  return [
    'flex items-center justify-between border-b border-line px-4 py-3 text-sm last:border-0',
    isToday ? 'bg-brand/5' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
