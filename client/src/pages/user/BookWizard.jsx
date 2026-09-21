import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Wallet,
  Download,
  PartyPopper,
  Info,
} from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import ServiceCard from '../../components/ServiceCard';
import ExtraChip from '../../components/ExtraChip';
import SlotPicker from '../../components/SlotPicker';
import ReceiptCard from '../../components/ReceiptCard';
import Button, { buttonVariants } from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { Tabs } from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';

import { useBooking, STEPS } from '../../hooks/useBooking';
import { useFeatures } from '../../hooks/useFeatures';
import { useServices, useExtras } from '../../hooks/useServices';
import { useSlots } from '../../hooks/useSlots';
import { useBookableStaff } from '../../hooks/useBookableStaff';
import { useSettingsPublic } from '../../hooks/useSettingsPublic';
import { useMyAppointments } from '../../hooks/useMyAppointments';
import StatusBadge from '../../components/StatusBadge';

import appointmentApi from '../../api/appointment.api';
import { getApiErrorMessage } from '../../config/axios';
import { formatMoney } from '../../utils/formatMoney';
import { formatDateTime, formatTime, isoDate } from '../../utils/datetime';
import { serverAsset } from '../../utils/serverAsset';
import { downloadReceiptPng } from '../../utils/receiptPng';
import cn from '../../utils/cn';

function Stepper({ step, labels }) {
  return (
    <ol className="flex items-center gap-1 sm:gap-2">
      {labels.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all',
                  done
                    ? 'bg-gradient-to-br from-brand to-accent text-white shadow-card'
                    : active
                      ? 'scale-110 bg-brand/10 text-brand ring-2 ring-brand shadow-[0_0_18px_rgb(225_29_72/0.45)]'
                      : 'bg-surface-2 text-muted'
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-[13px] font-medium min-[480px]:block',
                  active ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-muted'
                )}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  'h-0.5 flex-1 rounded-full',
                  i < step ? 'bg-gradient-to-r from-brand to-accent' : 'bg-line'
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function BookWizard() {
  const booking = useBooking();
  const queryClient = useQueryClient();
  const receiptRef = useRef(null);
  const stripRef = useRef(null);
  const scrollStrip = (dir) =>
    stripRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });

  // Mouse-drag scrolling for the cover-flow strip (touch uses native swipe).
  // Pointer capture engages only after a real drag starts, so plain clicks
  // on cards still dispatch normally.
  const dragRef = useRef({ down: false, moved: false, captured: false, startX: 0, startLeft: 0 });
  const onStripPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !stripRef.current) return;
    dragRef.current = { down: true, moved: false, captured: false, startX: e.clientX, startLeft: stripRef.current.scrollLeft };
  };
  const onStripPointerMove = (e) => {
    const d = dragRef.current;
    if (!d.down || !stripRef.current) return;
    const dx = e.clientX - d.startX;
    if (!d.captured && Math.abs(dx) > 8) {
      d.captured = true;
      d.moved = true;
      // Mandatory snap would yank mid-drag positions back — suspend it while
      // dragging; restoring it on release snaps to the nearest card.
      stripRef.current.style.scrollSnapType = 'none';
      try {
        stripRef.current.setPointerCapture(e.pointerId);
      } catch {
        /* no-op — dragging still works without capture */
      }
    }
    if (d.captured) stripRef.current.scrollLeft = d.startLeft - dx;
  };
  const onStripPointerUp = () => {
    dragRef.current.down = false;
    dragRef.current.captured = false;
    if (stripRef.current) stripRef.current.style.scrollSnapType = '';
  };

  const { data: settings } = useSettingsPublic();
  const currency = settings?.currency || 'PHP';

  // S9 school gating: extras step, one-booking gate, and PNG download hide
  // behind configuration.json flags (server enforces the same rules).
  const { isEnabled } = useFeatures();
  const extrasOn = isEnabled('extras.enabled');
  const oneBookingLimitOn = isEnabled('appointmentManagement.oneActiveBookingLimit');
  const pngOn = isEnabled('receipts.downloadPng');
  const visibleSteps = extrasOn ? STEPS : STEPS.filter((_, i) => i !== 1);
  const visibleIndex = extrasOn ? booking.step : booking.step === 0 ? 0 : booking.step - 1;
  // Summary (rail + mobile bar) appears only on the final steps.
  const showSummary = booking.step >= 3;
  // Internal step indices stay 0-4; navigation skips the hidden extras step.
  const goNext = () => {
    if (!extrasOn && booking.step === 0) booking.setStep(2);
    else booking.next();
  };
  const goBack = () => {
    if (!extrasOn && booking.step === 2) booking.setStep(0);
    else booking.back();
  };

  const servicesQuery = useServices();
  const extrasQuery = useExtras();

  // Enforce one active booking at a time (the server enforces this too). A booking
  // is "active" until it's done or cancelled.
  const myAppointmentsQuery = useMyAppointments({});
  const activeBooking = (myAppointmentsQuery.data?.appointments || []).find((a) =>
    ['pending', 'accepted', 'in_service'].includes(a.status)
  );

  const [category, setCategory] = useState('all');
  const [receipt, setReceipt] = useState(null);
  const [bookedAppt, setBookedAppt] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const today = isoDate();

  const slotsQuery = useSlots({
    serviceId: booking.service?._id,
    date: booking.date,
    extras: extrasOn ? booking.extras.map((e) => e._id) : [],
    // School mode: customers never pick a barber — the owner assigns one.
    // Slots stay bookable only while at least one barber is free.
    staffId: null,
  });

  // Default the schedule step to today the first time it's shown.
  useEffect(() => {
    if (booking.step === 2 && !booking.date) booking.setDate(today);
  }, [booking.step, booking.date, booking, today]);

  const services = servicesQuery.data || [];
  const filteredServices = useMemo(
    () => (category === 'all' ? services : services.filter((s) => s.category === category)),
    [services, category]
  );

  // Center-slide tracking for the cover-flow caption. Computed from geometry
  // (closest slide center to the scroller center) instead of visibility
  // ratios — overlap made IntersectionObserver report the wrong card.
  useEffect(() => {
    const root = stripRef.current;
    if (!root) return undefined;
    let raf = 0;
    const pick = () => {
      const viewport = root.getBoundingClientRect();
      const mid = viewport.left + viewport.width / 2;
      let best = null;
      let bestD = Infinity;
      const slides = root.querySelectorAll('[data-slide]');
      if (slides.length === 0) {
        setActiveId(null);
        return;
      }
      slides.forEach((sl) => {
        const r = sl.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestD) {
          bestD = d;
          best = sl;
        }
      });
      if (best) {
        const id = best.dataset.slide;
        setActiveId((prev) => (prev === id ? prev : id));
        // Keep the centered card painted above its angled neighbors.
        slides.forEach((sl) => {
          sl.style.zIndex = sl === best ? 10 : 1;
        });
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(pick);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    pick();
    return () => {
      root.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [filteredServices]);

  useEffect(() => {
    stripRef.current?.scrollTo({ left: 0 });
  }, [category]);

  const centerSlide = (id) => {
    stripRef.current
      ?.querySelector(`[data-slide="${id}"]`)
      ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  };

  const activeService =
    filteredServices.find((s) => s._id === activeId) ?? filteredServices[0] ?? null;

  // The centered card IS the choice — selecting follows the center
  // automatically so there is no separate choose step.
  useEffect(() => {
    if (activeService && booking.service?._id !== activeService._id) {
      booking.setService(activeService);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, filteredServices]);

  const bookMutation = useMutation({
    mutationFn: () =>
      appointmentApi
        .create({
          serviceId: booking.service._id,
          extras: extrasOn ? booking.extras.map((e) => e._id) : [],
          scheduledStart: booking.slot.start,
          paymentMethod: 'cash',
        })
        .then((r) => r.data.appointment),
    onSuccess: async (appt) => {
      setBookedAppt(appt);
      try {
        const rc = await appointmentApi.receipt(appt._id).then((r) => r.data.receipt);
        setReceipt(rc);
      } catch {
        setReceipt(null);
      }
      queryClient.invalidateQueries({ queryKey: ['appointments', 'mine'] });
      toast.success('Booking confirmed');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not complete your booking')),
  });

  const canProceed = [
    Boolean(booking.service), // 0 service
    true, // 1 extras optional
    Boolean(booking.slot), // 2 schedule
    booking.paymentMethod === 'cash', // 3 payment
    true, // 4 confirm
  ][booking.step];

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadReceiptPng(receiptRef.current, `${receipt?.receiptNo || 'azcuts-receipt'}.png`);
    } catch {
      toast.error('Could not export the receipt image');
    } finally {
      setDownloading(false);
    }
  };

  const startAnother = () => {
    setReceipt(null);
    setBookedAppt(null);
    booking.reset();
  };

  // ---------------------------------------------------------------- SUCCESS
  if (receipt) {
    const pending = bookedAppt && !bookedAppt.assignedStaff;
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <PartyPopper className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">You&apos;re booked!</h1>
          <p className="mt-1 text-sm text-muted">
            {pending
              ? 'Your slot is reserved and awaiting a barber to accept.'
              : 'Your appointment is confirmed. See you soon.'}
          </p>
        </div>

        {pending && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-sm text-warning ring-1 ring-inset ring-warning/20">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Pending — awaiting staff acceptance. You&apos;ll be notified once a barber takes it.</span>
          </div>
        )}

        <div className="flex justify-center">
          <ReceiptCard ref={receiptRef} receipt={receipt} />
        </div>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {pngOn && (
            <Button onClick={handleDownload} loading={downloading}>
              <Download className="h-4 w-4" />
              Download receipt
            </Button>
          )}
          <Button variant="outline" onClick={startAnother}>
            Book another
          </Button>
          <Link to="/app/history" className={buttonVariants({ variant: 'ghost' })}>
            View my bookings
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------- ACTIVE BOOKING GATE
  // S9: only enforced when the oneActiveBookingLimit flag is on (off in school mode).
  if (activeBooking && oneBookingLimitOn) {
    return (
      <div>
        <PageHeader
          title="Book a service"
          description={
            extrasOn ? 'Choose a service, add extras, pick a time, and confirm.' : 'Choose a service, pick a time, and confirm.'
          }
        />
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-line bg-surface p-6 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
              <Info className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-ink">
              You already have a booking in progress
            </h2>
            <p className="mt-1 text-sm text-muted">
              You can only have one active booking at a time. Please wait until your current booking is
              completed, or cancel it, before booking again.
            </p>

            <div className="mt-5 rounded-xl border border-line bg-surface-2 p-4 text-left">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-ink">
                  {activeBooking.service?.name || 'Your booking'}
                </span>
                <StatusBadge status={activeBooking.status} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {activeBooking.scheduledStart ? formatDateTime(activeBooking.scheduledStart) : ''}
                {activeBooking.assignedStaff?.fullName
                  ? ` · ${activeBooking.assignedStaff.fullName}`
                  : ''}
              </p>
            </div>

            <div className="mt-5 flex justify-center">
              <Link to="/app/history" className={buttonVariants()}>
                View my bookings
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ WIZARD
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Book a service
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted sm:text-base">
          {extrasOn ? 'Choose a service, add extras, pick a time, and confirm.' : 'Choose a service, pick a time, and confirm.'}
        </p>
      </div>

      <div className="mb-8">
        <Stepper step={visibleIndex} labels={visibleSteps} />
      </div>

      <div className={cn('grid gap-6', showSummary && 'lg:grid-cols-[1fr_320px]')}>
        <div className="min-w-0">
          {/* Step 0 — Service */}
          {booking.step === 0 && (
            <div>
              <div className="mb-5 flex justify-center">
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
              {servicesQuery.isLoading ? (
                <div className="flex justify-center py-16">
                  <Spinner className="text-brand" />
                </div>
              ) : filteredServices.length === 0 ? (
                <EmptyState title="No services available" description="Please check back later." />
              ) : (
                <>
                  <div className="relative overflow-hidden rounded-3xl bg-[rgb(245_243_236)] px-5 py-10 dark:bg-[#0B0D12] sm:px-6">
                    {/* Mobile-only edge fades: melt tilted end-fragments into the
                        background so the single-card view always reads clean. */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-10 bg-gradient-to-r from-[rgb(245_243_236)] to-transparent dark:from-[#0B0D12] sm:hidden" />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-10 bg-gradient-to-l from-[rgb(245_243_236)] to-transparent dark:from-[#0B0D12] sm:hidden" />
                    <div
                      ref={stripRef}
                      onPointerDown={onStripPointerDown}
                      onPointerMove={onStripPointerMove}
                      onPointerUp={onStripPointerUp}
                      onPointerCancel={onStripPointerUp}
                      className="cf-strip cf-stage cursor-grab overflow-x-auto active:cursor-grabbing"
                    >
                      <div className="cf-track flex w-max items-stretch -space-x-8 px-[calc(50%-36vw)] py-8 sm:px-[calc(50%-min(37.5vw,220px))]">
                        {filteredServices.map((service) => {
                          const img = serverAsset(service.image);
                          return (
                            <div
                              key={service._id}
                              data-slide={service._id}
                              className="cf-slide relative w-[72vw] shrink-0 sm:w-[min(75vw,440px)]"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (dragRef.current.moved) {
                                    dragRef.current.moved = false;
                                    return;
                                  }
                                  centerSlide(service._id);
                                }}
                                onDragStart={(e) => e.preventDefault()}
                                aria-label={`View ${service.name}`}
                                className="cf-card focus-ring block aspect-[3/4] w-full overflow-hidden rounded-[2rem] bg-white/5"
                              >
                                {img ? (
                                  <img
                                    src={img}
                                    alt={service.name}
                                    loading="lazy"
                                    draggable="false"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/30 to-accent/10 font-serif text-7xl text-white/80">
                                    {service.name.charAt(0)}
                                  </span>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollStrip(-1)}
                      aria-label="Previous services"
                      className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-muted transition-colors hover:text-ink focus-ring dark:text-white/60 dark:hover:text-white sm:left-3"
                    >
                      <ChevronLeft className="h-9 w-9 drop-shadow-lg" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollStrip(1)}
                      aria-label="Next services"
                      className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-muted transition-colors hover:text-ink focus-ring dark:text-white/60 dark:hover:text-white sm:right-3"
                    >
                      <ChevronRight className="h-9 w-9 drop-shadow-lg" />
                    </button>
                  </div>

                  {activeService && (
                    <div className="mx-auto mt-6 max-w-[440px] text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
                        {activeService.category === 'salon' ? 'Salon' : 'Haircut'}
                      </p>
                      <h3 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink">
                        {activeService.name}
                      </h3>
                      {activeService.description && (
                        <p className="mx-auto mt-2 line-clamp-2 max-w-md text-sm text-muted">
                          {activeService.description}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-muted tnum">
                        <span className="font-semibold text-ink">
                          {formatMoney(activeService.price, currency)}
                        </span>
                        {' · '}
                        {activeService.durationMinutes} min
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        {filteredServices.map((s) => (
                          <button
                            key={s._id}
                            type="button"
                            onClick={() => centerSlide(s._id)}
                            aria-label={`Go to ${s.name}`}
                            className={cn(
                              'h-2 rounded-full transition-all focus-ring',
                              s._id === activeService._id ? 'w-6 bg-brand' : 'w-2 bg-line hover:bg-muted'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 1 — Extras (hidden in school mode) */}
          {extrasOn && booking.step === 1 && (
            <div>
              <h2 className="mb-1 text-lg font-semibold text-ink">Add extras</h2>
              <p className="mb-4 text-sm text-muted">Optional add-ons. Skip if you don&apos;t need any.</p>
              {extrasQuery.isLoading ? (
                <div className="flex justify-center py-16">
                  <Spinner className="text-brand" />
                </div>
              ) : (extrasQuery.data || []).length === 0 ? (
                <EmptyState title="No extras available" description="You can continue without add-ons." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {extrasQuery.data.map((extra) => (
                    <ExtraChip
                      key={extra._id}
                      extra={extra}
                      currency={currency}
                      selected={booking.extras.some((e) => e._id === extra._id)}
                      onToggle={booking.toggleExtra}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Schedule (no barber choice: the owner assigns one) */}
          {booking.step === 2 && (
            <div>
              <h2 className="mb-1 text-lg font-semibold text-ink">Pick a time</h2>
              <p className="mb-4 text-sm text-muted">
                Only times with a free barber can be booked. The owner assigns your barber after booking.
              </p>
              <SlotPicker
                date={booking.date || today}
                minDate={today}
                onDateChange={booking.setDate}
                slotsQuery={slotsQuery}
                selectedStart={booking.slot?.start}
                onSelectSlot={booking.setSlot}
                mode="specific"
              />
            </div>
          )}

          {/* Step 3 — Payment */}
          {booking.step === 3 && (
            <div>
              <h2 className="mb-1 text-lg font-semibold text-ink">Payment</h2>
              <p className="mb-4 text-sm text-muted">Pay at the shop. Online payment is coming soon.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => booking.setPayment('cash')}
                  aria-pressed={booking.paymentMethod === 'cash'}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-4 text-left transition-colors focus-ring',
                    booking.paymentMethod === 'cash'
                      ? 'border-brand bg-brand/5'
                      : 'border-line bg-surface hover:bg-surface-2'
                  )}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-ink">Cash</span>
                    <span className="block text-xs text-muted">Pay at the shop</span>
                  </span>
                </button>
                <div
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-line bg-surface-2 p-4 text-left opacity-70"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-muted">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-ink">GCash</span>
                    <span className="block text-xs text-muted">Coming soon</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Confirm */}
          {booking.step === 4 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-ink">Review &amp; confirm</h2>
              <div className="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-card">
                <Row label="Service" value={booking.service?.name} />
                {extrasOn && (
                  <Row
                    label="Extras"
                    value={
                      booking.extras.length
                        ? booking.extras.map((e) => e.name).join(', ')
                        : 'None'
                    }
                  />
                )}
                <Row
                  label="Barber"
                  value="Assigned by the owner after booking"
                />
                <Row
                  label="When"
                  value={booking.slot ? formatDateTime(booking.slot.start) : '—'}
                />
                <Row label="Duration" value={`${booking.totalDuration} min`} />
                <div className="border-t border-dashed border-line pt-3">
                  <Row label="Estimated total" value={formatMoney(booking.subtotal, currency)} strong />
                  <p className="mt-1 text-xs text-muted">
                    Final total (incl. any tax/discount) is confirmed on your receipt.
                  </p>
                </div>
              </div>
              <Button
                className="mt-5 w-full"
                size="lg"
                loading={bookMutation.isPending}
                onClick={() => bookMutation.mutate()}
              >
                Confirm booking
              </Button>
            </div>
          )}

          {/* Nav (desktop — mobile uses in-flow nav on early steps, sticky bar on final steps) */}
          {booking.step < 4 && (
            <div
              className={cn(
                'mt-8 items-center justify-between',
                booking.step < 3 ? 'flex' : 'hidden lg:flex'
              )}
            >
              <Button variant="ghost" onClick={goBack} disabled={booking.step === 0}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={goNext} disabled={!canProceed}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          {booking.step === 4 && (
            <div className="mt-4 hidden lg:block">
              <Button variant="ghost" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          )}
        </div>

        {/* Summary rail (final steps only) */}
        {showSummary && (
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <h3 className="text-sm font-semibold text-ink">Summary</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Service</dt>
                <dd className="text-right font-medium text-ink">
                  {booking.service ? booking.service.name : '—'}
                </dd>
              </div>
              {booking.service && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Base</dt>
                  <dd className="tnum text-ink">{formatMoney(booking.service.price, currency)}</dd>
                </div>
              )}
              {extrasOn &&
                booking.extras.map((e) => (
                  <div key={e._id} className="flex items-center justify-between gap-3">
                    <dt className="text-muted">+ {e.name}</dt>
                    <dd className="tnum text-ink">{formatMoney(e.price, currency)}</dd>
                  </div>
                ))}
              {booking.slot && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Time</dt>
                  <dd className="text-ink">{formatTime(booking.slot.start)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 text-muted">
                <dt className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Duration
                </dt>
                <dd>{booking.totalDuration || 0} min</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <span className="text-sm text-muted">Estimated total</span>
              <span className="text-lg font-semibold text-ink tnum">
                {formatMoney(booking.subtotal, currency)}
              </span>
            </div>
          </div>
        </aside>
        )}
      </div>

      {/* Mobile sticky summary bar (final steps only) */}
      {showSummary && (
      <div className="sticky bottom-4 z-30 mt-6 lg:hidden">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface/95 px-3 py-2.5 shadow-pop backdrop-blur">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={booking.step === 0}
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {booking.service ? booking.service.name : 'No service yet'}
            </p>
            <p className="text-xs text-muted tnum">
              {formatMoney(booking.subtotal, currency)} · {booking.totalDuration || 0} min
            </p>
          </div>
          {booking.step < 4 ? (
            <Button size="sm" onClick={goNext} disabled={!canProceed}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <span className="px-1 text-sm font-semibold text-ink tnum">
              {formatMoney(booking.subtotal, currency)}
            </span>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className={cn('text-right', strong ? 'text-base font-semibold text-ink tnum' : 'text-ink')}>
        {value}
      </span>
    </div>
  );
}
