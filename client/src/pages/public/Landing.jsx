import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Phone, Mail, Star, Scissors, Sparkles } from 'lucide-react';

import PublicNavbar from '../../components/layout/PublicNavbar';
import LandingAuthPanel from '../../components/layout/LandingAuthPanel';
import { Tabs } from '../../components/ui/Tabs';
import Skeleton from '../../components/ui/Skeleton';
import Reveal from '../../components/ui/Reveal';
import { useSettingsPublic } from '../../hooks/useSettingsPublic';
import { useAuth } from '../../hooks/useAuth';
import { formatMoney } from '../../utils/formatMoney';
import { formatClock } from '../../utils/datetime';
import { serverAsset } from '../../utils/serverAsset';
import cn from '../../utils/cn';
import lisaImg from './images/lisa.jpg';
import mrbeastImg from './images/mrbeast.png';

// Where the "Book" CTAs go: guests register first; signed-in users land in their portal.
const BOOK_BY_ROLE = { user: '/app/book', staff: '/staff', admin: '/admin' };

// Editorial hero photography (grayscale-treated in the UI).
const HERO_IMG =
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80';

// Category icon used as the service fallback when no image is uploaded.
const CATEGORY_ICON = { haircut: Scissors, salon: Sparkles };

// Subtle dotted texture (from the design template).
const DOT_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23232733' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";

const STATS = [
  { value: '67+', label: 'Years Experience', tone: 'brand' },
  { value: '6.9k+', label: 'Cuts Completed', tone: 'accent' },
  { value: '6.7', label: 'Avg. Rating', tone: 'brand' },
];

// The people who built AzCuts (credited in a small section, separate from barbers).
const DEVELOPERS = [
  {
    name: 'Uelmark G. Valdehueza',
    role: 'Head Developer',
    img: 'https://avatars.githubusercontent.com/u/76932815',
  },
  { name: 'JM Nikko O. Gallardo', role: 'Assistant Developer' },
  { name: 'Lara Angel A. Habagat', role: 'Assistant Developer' },
];

const STORIES = [
  {
    quote:
      'Sharpest I\u2019ve looked outside a photoshoot. The team nailed the style and booking was effortless.',
    name: 'Lalisa Manobal',
    detail: 'Lisa from BLACKPINK',
    img: lisaImg,
  },
  {
    quote:
      'Fastest, cleanest cut ever — in and out, looking fresh. AzCuts is the real deal.',
    name: 'Jimmy Donaldson',
    detail: 'MrBeast',
    img: mrbeastImg,
  },
];

const DAYS = [
  ['mon', 'Mon'],
  ['tue', 'Tue'],
  ['wed', 'Wed'],
  ['thu', 'Thu'],
  ['fri', 'Fri'],
  ['sat', 'Sat'],
  ['sun', 'Sun'],
];

function initialsOf(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

function Eyebrow({ children }) {
  return (
    <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">{children}</p>
  );
}

export default function Landing() {
  const { data, isLoading } = useSettingsPublic();
  const { isAuthenticated, role } = useAuth();
  const [category, setCategory] = useState('all');
  const [authMode, setAuthMode] = useState(null); // 'login' | 'register' | null

  // Guests open the slide-in auth panel instead of navigating away.
  const handleBookClick = (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setAuthMode('register');
    }
  };

  const shop = data?.shopInfo || {};
  const currency = data?.currency || 'PHP';
  const services = data?.services || [];
  const staff = data?.staff || [];
  const storeHours = data?.storeHours || {};
  const socials = shop.socials || {};

  const bookHref = isAuthenticated ? BOOK_BY_ROLE[role] || '/app/book' : '/register';

  const filtered = useMemo(
    () => (category === 'all' ? services : services.filter((s) => s.category === category)),
    [services, category]
  );

  const stats = [
    ...STATS,
    { value: String(staff.length || 0), label: 'Master Barbers', tone: 'accent' },
  ];

  return (
    <div className="min-h-screen overflow-x-clip bg-app text-ink" style={{ backgroundImage: DOT_TEXTURE }}>
      <PublicNavbar onAuth={setAuthMode} />
      <LandingAuthPanel
        mode={authMode}
        onClose={() => setAuthMode(null)}
        onSwitchMode={setAuthMode}
      />

      {data?.systemMode && data.systemMode !== 'online' && (
        <div className="bg-warning/10 px-4 py-2 text-center text-sm text-warning">
          We&apos;re currently in {data.systemMode} mode. Booking may be temporarily unavailable.
        </div>
      )}

      <main>
        {/* Hero — always dark & cinematic for contrast, regardless of theme */}
        <section id="home" className="relative overflow-hidden border-b border-line bg-[#0F1115]">
          <div className="absolute inset-0 z-0">
            <img
              src={HERO_IMG}
              alt=""
              className="h-full w-full object-cover object-top opacity-40 grayscale contrast-125"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1115] via-[#0F1115]/80 to-[#0F1115]/40" />
          </div>
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
            <Reveal direction="left" className="max-w-3xl">
              <Eyebrow>Sharp Looks. Effortless Booking.</Eyebrow>
              <h1 className="mb-6 font-display text-5xl font-bold uppercase leading-none text-white md:text-7xl">
                Precision Cuts. <br />
                <span className="text-brand">Bold</span> Statements.
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-gray-300">
                More than just a barber shop. AzCuts is a community of professionals dedicated to
                refining your style. High-contrast, high-quality, high-impact.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  to={bookHref}
                  onClick={handleBookClick}
                  className="inline-flex items-center justify-center gap-2 bg-brand px-8 py-4 font-bold uppercase tracking-wider text-brand-fg transition-colors hover:bg-brand-hover focus-ring"
                >
                  Book Appointment
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#services"
                  className="inline-flex items-center justify-center border border-white/20 px-8 py-4 font-bold uppercase tracking-wider text-white transition-colors hover:border-accent focus-ring"
                >
                  View Services
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Stats bar */}
        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
              {stats.map((s, i) => (
                <Reveal key={s.label} direction="up" delay={i * 100}>
                  <p
                    className={cn(
                      'font-display text-4xl font-bold',
                      s.tone === 'accent' ? 'text-accent' : 'text-brand'
                    )}
                  >
                    {s.value}
                  </p>
                  <p className="mt-1 text-sm uppercase tracking-wider text-muted">{s.label}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Services — real data from the API */}
        <section id="services" className="scroll-mt-20 border-b border-line">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
              <Reveal direction="left">
                <Eyebrow>What We Do</Eyebrow>
                <h2 className="font-display text-4xl font-bold uppercase text-ink md:text-5xl">
                  Our Services
                </h2>
              </Reveal>
              <Reveal direction="right" className="flex flex-col gap-4 md:items-end">
                <p className="max-w-md text-sm leading-relaxed text-ink/70">
                  Whether you need a sharp fade, a salon treatment, or a complete transformation, we
                  have the expertise. Pick one when you book.
                </p>
                <Tabs
                  value={category}
                  onChange={setCategory}
                  tabs={[
                    { value: 'all', label: 'All' },
                    { value: 'haircut', label: 'Haircuts' },
                    { value: 'salon', label: 'Salon' },
                  ]}
                />
              </Reveal>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border border-line bg-surface p-6">
                    <Skeleton className="mb-4 h-48 w-full rounded-none" />
                    <Skeleton className="mb-2 h-6 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted">No services in this category yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {filtered.map((service, i) => (
                  <Reveal
                    key={service._id}
                    direction="up"
                    delay={(i % 3) * 120}
                    className="h-full"
                  >
                  <div
                    className="group flex h-full flex-col border border-line bg-surface p-6 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-card-hover"
                  >
                    <div className="mb-4 h-48 overflow-hidden">
                      {serverAsset(service.image) ? (
                        <img
                          src={serverAsset(service.image)}
                          alt={service.name}
                          loading="lazy"
                          className="h-full w-full object-cover grayscale contrast-125 transition duration-300 group-hover:grayscale-0"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/20 via-surface-2 to-accent/10">
                          {(() => {
                            const Icon = CATEGORY_ICON[service.category] || Scissors;
                            return <Icon className="h-10 w-10 text-brand/70" />;
                          })()}
                        </div>
                      )}
                    </div>
                    <h3 className="mb-2 font-display text-2xl font-bold uppercase text-ink">
                      {service.name}
                    </h3>
                    <p className="mb-4 flex-grow text-sm text-muted">
                      {service.description || `${service.durationMinutes} min · ${service.category}`}
                    </p>
                    <div className="flex items-center justify-between border-t border-line pt-4">
                      <span className="text-lg font-bold text-brand">
                        {formatMoney(service.price, currency)}
                      </span>
                      <Link
                        to={bookHref}
                        onClick={handleBookClick}
                        className="inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-wider text-accent transition-colors hover:text-accent-hover"
                      >
                        Select <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Team / Barbers — real staff roster from the API */}
        <section id="team" className="scroll-mt-20 border-b border-line bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <Reveal direction="fade" className="mb-12 text-center">
              <Eyebrow>The Professionals</Eyebrow>
              <h2 className="font-display text-4xl font-bold uppercase text-ink md:text-5xl">
                Meet The Barbers
              </h2>
            </Reveal>

            {staff.length === 0 ? (
              <p className="text-center text-sm text-muted">
                Our barbers will be introduced here soon.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {staff.map((barber, i) => (
                  <Reveal key={barber._id} direction="up" delay={(i % 3) * 120} className="group">
                    <div className="relative mb-4 aspect-[3/4] overflow-hidden">
                      {serverAsset(barber.avatar) ? (
                        <img
                          src={serverAsset(barber.avatar)}
                          alt={barber.fullName}
                          loading="lazy"
                          className="h-full w-full object-cover grayscale transition duration-300 group-hover:grayscale-0"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/20 via-surface-2 to-accent/10">
                          <span className="font-serif text-5xl font-semibold text-brand">
                            {initialsOf(barber.fullName)}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0F1115] to-transparent" />
                    </div>
                    <h3 className="font-display text-xl font-bold uppercase text-ink">
                      {barber.fullName}
                    </h3>
                    <p className="mb-1 text-sm font-semibold text-brand">
                      {barber.nickname || 'Barber'}
                    </p>
                    {barber.ratingCount > 0 && (
                      <p className="flex items-center gap-1 text-sm text-muted">
                        <Star className="h-3.5 w-3.5 fill-current text-brand" />
                        {Number(barber.avgRating).toFixed(1)}
                        <span className="text-xs">
                          ({barber.ratingCount} review{barber.ratingCount === 1 ? '' : 's'})
                        </span>
                      </p>
                    )}
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Stories */}
        <section id="stories" className="scroll-mt-20 border-b border-line">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
              <Reveal direction="left">
                <Eyebrow>Real Results</Eyebrow>
                <h2 className="font-display text-4xl font-bold uppercase text-ink md:text-5xl">
                  Client Stories
                </h2>
              </Reveal>
              <Reveal direction="right" as="p" className="max-w-md text-sm leading-relaxed text-ink/70">
                Transformations that speak for themselves. Join the community of satisfied clients.
              </Reveal>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {STORIES.map((story, i) => (
                <Reveal
                  key={story.name}
                  direction={i === 0 ? 'left' : 'right'}
                  className="group flex flex-col border border-line bg-surface transition-all hover:-translate-y-0.5 hover:border-brand md:flex-row"
                >
                  <img
                    src={story.img}
                    alt={story.name}
                    loading="lazy"
                    className="h-48 w-full object-cover grayscale contrast-125 transition duration-300 group-hover:grayscale-0 md:h-auto md:w-1/3"
                  />
                  <div className="flex flex-col justify-center p-6">
                    <div className="mb-2 flex gap-0.5 text-brand">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <p className="mb-4 text-sm italic leading-relaxed text-ink/90">{story.quote}</p>
                    <p className="text-sm font-bold uppercase tracking-wider text-accent">
                      {story.name}
                    </p>
                    <p className="text-xs text-muted">{story.detail}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Developers — small credits row, distinct from the barbers */}
        <section id="developers" className="scroll-mt-20 border-b border-line">
          <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
            <Reveal direction="fade" className="mb-8 text-center">
              <Eyebrow>Behind The Build</Eyebrow>
              <h2 className="font-display text-2xl font-bold uppercase text-ink md:text-3xl">
                The Developers
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {DEVELOPERS.map((dev, i) => (
                <Reveal
                  key={dev.name}
                  direction="up"
                  delay={i * 100}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
                >
                  {dev.img ? (
                    <img
                      src={dev.img}
                      alt={dev.name}
                      loading="lazy"
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                      {initialsOf(dev.name)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{dev.name}</p>
                    <p className="text-xs text-muted">{dev.role}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-surface">
          <Reveal direction="up" className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 font-display text-4xl font-bold uppercase text-ink md:text-5xl">
              Ready for a <span className="text-brand">Sharp</span> Look?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted">
              Book your appointment today. Experience the AzCuts difference — where professionalism
              meets community.
            </p>
            <Link
              to={bookHref}
              onClick={handleBookClick}
              className="inline-flex items-center gap-2 bg-brand px-10 py-5 text-lg font-bold uppercase tracking-wider text-brand-fg transition-transform hover:scale-105 hover:bg-brand-hover focus-ring"
            >
              Book Appointment
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Reveal>
        </section>
      </main>

      {/* Contact + Footer — wired to shop settings */}
      <footer id="contact" className="scroll-mt-20 bg-app">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <span className="font-display text-2xl font-bold tracking-wider text-ink">
                AZ<span className="text-brand">CUTS</span>
              </span>
              <p className="mt-4 text-sm text-muted">
                {shop.tagline || 'Sharp looks, effortless booking. Your trusted local barber shop and salon.'}
              </p>
              {Object.keys(socials).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(socials).map(([name, url]) => (
                    <a
                      key={name}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-line px-3 py-1.5 text-xs capitalize text-muted transition-colors hover:border-accent hover:text-ink"
                    >
                      {name}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-4 font-display text-sm uppercase tracking-wider text-ink">Location</h4>
              <ul className="space-y-3 text-sm text-muted">
                {shop.address && (
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>{shop.address}</span>
                  </li>
                )}
                {shop.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-brand" />
                    <a href={`tel:${shop.phone}`} className="hover:text-ink">
                      {shop.phone}
                    </a>
                  </li>
                )}
                {shop.email && (
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-brand" />
                    <a href={`mailto:${shop.email}`} className="hover:text-ink">
                      {shop.email}
                    </a>
                  </li>
                )}
                {!shop.address && !shop.phone && !shop.email && (
                  <li>123 Main Street, Quezon City, Metro Manila</li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 flex items-center gap-2 font-display text-sm uppercase tracking-wider text-ink">
                <Clock className="h-4 w-4 text-brand" /> Hours
              </h4>
              <ul className="space-y-1.5 text-sm text-muted">
                {DAYS.map(([key, label]) => {
                  const h = storeHours[key];
                  const closed = !h || h.closed;
                  return (
                    <li key={key} className="flex items-center justify-between gap-4">
                      <span>{label}</span>
                      <span className={closed ? 'text-muted' : 'tnum text-ink'}>
                        {closed ? 'Closed' : `${formatClock(h.open)} – ${formatClock(h.close)}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-line pt-8 md:flex-row">
            <p className="text-xs text-muted">
              © {new Date().getFullYear()} {shop.name || 'AzCuts'}. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm">
              {isAuthenticated ? (
                <Link to={BOOK_BY_ROLE[role] || '/app'} className="font-medium text-brand hover:underline">
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="text-muted transition-colors hover:text-ink"
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className="font-medium text-brand hover:underline"
                  >
                    Book now
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
