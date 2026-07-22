import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Phone, Mail, Star } from 'lucide-react';

import PublicNavbar from '../../components/layout/PublicNavbar';
import { Tabs } from '../../components/ui/Tabs';
import Skeleton from '../../components/ui/Skeleton';
import { useSettingsPublic } from '../../hooks/useSettingsPublic';
import { useAuth } from '../../hooks/useAuth';
import { formatMoney } from '../../utils/formatMoney';
import { formatClock } from '../../utils/datetime';
import { serverAsset } from '../../utils/serverAsset';
import cn from '../../utils/cn';

// Where the "Book" CTAs go: guests register first; signed-in users land in their portal.
const BOOK_BY_ROLE = { user: '/app/book', staff: '/staff', admin: '/admin' };

// Editorial photography (grayscale-treated in the UI).
const HERO_IMG =
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80';
const CATEGORY_IMG = {
  haircut:
    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  salon:
    'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
};
const FALLBACK_SERVICE_IMG =
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';

// Subtle dotted texture (from the design template).
const DOT_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23232733' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";

const STATS = [
  { value: '15+', label: 'Years Experience', tone: 'brand' },
  { value: '8k+', label: 'Cuts Completed', tone: 'accent' },
  { value: '4.9', label: 'Avg. Rating', tone: 'brand' },
];

const TEAM = [
  {
    name: 'Uelmark G. Valdehueza',
    role: 'Head Barber / Founder',
    bio: '10+ years specializing in classic cuts and modern fades. The visionary behind AzCuts.',
    img: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'JM Nikko O. Gallardo',
    role: 'Style Barber',
    bio: 'Expert in beard sculpting and urban styles. A detail-oriented precisionist.',
    img: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Lara Angel A. Habagat',
    role: 'Salon Specialist',
    bio: 'Master of color, treatments, and transformations. Brings artistry to every session.',
    img: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  },
];

const STORIES = [
  {
    quote:
      'Best haircut I\u2019ve ever had. The atmosphere is intense and professional. Uelmark knew exactly what I wanted.',
    name: 'Mark S.',
    detail: 'Skin Fade & Beard Sculpt',
    img: 'https://images.unsplash.com/photo-1604014438952-72e67f8f7f75?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
  },
  {
    quote:
      'Lara did an amazing job with my hair color. The booking system was effortless. Highly recommend AzCuts!',
    name: 'Elena R.',
    detail: 'Color & Treatment',
    img: 'https://images.unsplash.com/photo-1542662565-7e4b9f8c5c7f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
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

function serviceImage(s) {
  return serverAsset(s.image) || CATEGORY_IMG[s.category] || FALLBACK_SERVICE_IMG;
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

  const shop = data?.shopInfo || {};
  const currency = data?.currency || 'PHP';
  const services = data?.services || [];
  const storeHours = data?.storeHours || {};
  const socials = shop.socials || {};

  const bookHref = isAuthenticated ? BOOK_BY_ROLE[role] || '/app/book' : '/register';

  const filtered = useMemo(
    () => (category === 'all' ? services : services.filter((s) => s.category === category)),
    [services, category]
  );

  const stats = [...STATS, { value: String(TEAM.length), label: 'Master Barbers', tone: 'accent' }];

  return (
    <div className="min-h-screen bg-app text-ink" style={{ backgroundImage: DOT_TEXTURE }}>
      <PublicNavbar />

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
              className="h-full w-full object-cover opacity-40 grayscale contrast-125"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1115] via-[#0F1115]/80 to-[#0F1115]/40" />
          </div>
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
            <div className="max-w-3xl">
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
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <p
                    className={cn(
                      'font-display text-4xl font-bold',
                      s.tone === 'accent' ? 'text-accent' : 'text-brand'
                    )}
                  >
                    {s.value}
                  </p>
                  <p className="mt-1 text-sm uppercase tracking-wider text-muted">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services — real data from the API */}
        <section id="services" className="scroll-mt-20 border-b border-line">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
              <div>
                <Eyebrow>What We Do</Eyebrow>
                <h2 className="font-display text-4xl font-bold uppercase text-ink md:text-5xl">
                  Our Services
                </h2>
              </div>
              <div className="flex flex-col gap-4 md:items-end">
                <p className="max-w-md text-sm leading-relaxed text-muted">
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
              </div>
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
                {filtered.map((service) => (
                  <div
                    key={service._id}
                    className="group flex flex-col border border-line bg-surface p-6 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-card-hover"
                  >
                    <div className="mb-4 h-48 overflow-hidden">
                      <img
                        src={serviceImage(service)}
                        alt={service.name}
                        loading="lazy"
                        className="h-full w-full object-cover grayscale contrast-125 transition duration-300 group-hover:grayscale-0"
                      />
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
                        className="inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-wider text-accent transition-colors hover:text-accent-hover"
                      >
                        Select <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Team / Barbers */}
        <section id="team" className="scroll-mt-20 border-b border-line bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <Eyebrow>The Professionals</Eyebrow>
              <h2 className="font-display text-4xl font-bold uppercase text-ink md:text-5xl">
                Meet The Barbers
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {TEAM.map((member) => (
                <div key={member.name} className="group">
                  <div className="relative mb-4 overflow-hidden">
                    <img
                      src={member.img}
                      alt={member.name}
                      loading="lazy"
                      className="h-80 w-full object-cover grayscale transition duration-300 group-hover:grayscale-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F1115] to-transparent" />
                  </div>
                  <h3 className="font-display text-xl font-bold uppercase text-ink">{member.name}</h3>
                  <p className="mb-2 text-sm font-semibold text-brand">{member.role}</p>
                  <p className="text-sm text-muted">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stories */}
        <section id="stories" className="scroll-mt-20 border-b border-line">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
              <div>
                <Eyebrow>Real Results</Eyebrow>
                <h2 className="font-display text-4xl font-bold uppercase text-ink md:text-5xl">
                  Client Stories
                </h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-muted">
                Transformations that speak for themselves. Join the community of satisfied clients.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {STORIES.map((story) => (
                <div
                  key={story.name}
                  className="flex flex-col border border-line bg-surface transition-all hover:-translate-y-0.5 hover:border-brand md:flex-row"
                >
                  <img
                    src={story.img}
                    alt={story.name}
                    loading="lazy"
                    className="h-48 w-full object-cover grayscale contrast-125 md:h-auto md:w-1/3"
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
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 font-display text-4xl font-bold uppercase text-ink md:text-5xl">
              Ready for a <span className="text-brand">Sharp</span> Look?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted">
              Book your appointment today. Experience the AzCuts difference — where professionalism
              meets community.
            </p>
            <Link
              to={bookHref}
              className="inline-flex items-center gap-2 bg-brand px-10 py-5 text-lg font-bold uppercase tracking-wider text-brand-fg transition-transform hover:scale-105 hover:bg-brand-hover focus-ring"
            >
              Book Appointment
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
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
                  <Link to="/login" className="text-muted transition-colors hover:text-ink">
                    Log in
                  </Link>
                  <Link to="/register" className="font-medium text-brand hover:underline">
                    Book now
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
