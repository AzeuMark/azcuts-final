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
import StaffPicker from '../../components/StaffPicker';
import ReceiptCard from '../../components/ReceiptCard';
import Button, { buttonVariants } from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { Tabs } from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';

import { useBooking, STEPS } from '../../hooks/useBooking';
import { useServices, useExtras } from '../../hooks/useServices';
import { useSlots } from '../../hooks/useSlots';
import { useBookableStaff } from '../../hooks/useBookableStaff';
import { useSettingsPublic } from '../../hooks/useSettingsPublic';

import appointmentApi from '../../api/appointment.api';
import { getApiErrorMessage } from '../../config/axios';
import { formatMoney } from '../../utils/formatMoney';
import { formatDateTime, formatTime, isoDate } from '../../utils/datetime';
import { downloadReceiptPng } from '../../utils/receiptPng';
import cn from '../../utils/cn';

function Stepper({ step }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  done
                    ? 'bg-brand text-brand-fg'
                    : active
                      ? 'bg-brand/10 text-brand ring-2 ring-brand'
                      : 'bg-surface-2 text-muted'
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-sm font-medium sm:block',
                  active ? 'text-ink' : 'text-muted'
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
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

  const { data: settings } = useSettingsPublic();
  const currency = settings?.currency || 'PHP';

  const servicesQuery = useServices();
  const extrasQuery = useExtras();
  const staffQuery = useBookableStaff();

  const [category, setCategory] = useState('all');
  const [receipt, setReceipt] = useState(null);
  const [bookedAppt, setBookedAppt] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const today = isoDate();

  const slotsQuery = useSlots({
    serviceId: booking.service?._id,
    date: booking.date,
    extras: booking.extras.map((e) => e._id),
    staffId: booking.staff === 'auto' ? null : booking.staff,
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

  const bookMutation = useMutation({
    mutationFn: () =>
      appointmentApi
        .create({
          serviceId: booking.service._id,
          extras: booking.extras.map((e) => e._id),
          scheduledStart: booking.slot.start,
          staffId: booking.staff === 'auto' ? undefined : booking.staff,
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
          <Button onClick={handleDownload} loading={downloading}>
            <Download className="h-4 w-4" />
            Download receipt
          </Button>
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

  // ------------------------------------------------------------------ WIZARD
  return (
    <div>
      <PageHeader
        title="Book a service"
        description="Choose a service, add extras, pick a time, and confirm."
      />

      <div className="mb-8">
        <Stepper step={booking.step} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {/* Step 0 — Service */}
          {booking.step === 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-ink">Choose a service</h2>
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
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredServices.map((service) => (
                    <ServiceCard
                      key={service._id}
                      service={service}
                      currency={currency}
                      selectable
                      selected={booking.service?._id === service._id}
                      onSelect={booking.setService}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 1 — Extras */}
          {booking.step === 1 && (
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

          {/* Step 2 — Schedule */}
          {booking.step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-1 text-lg font-semibold text-ink">Choose your barber</h2>
                <p className="mb-4 text-sm text-muted">Pick a specific barber or let us auto-match.</p>
                <StaffPicker
                  staff={staffQuery.data || []}
                  loading={staffQuery.isLoading}
                  value={booking.staff}
                  onChange={booking.setStaff}
                />
              </div>
              <div>
                <h2 className="mb-3 text-lg font-semibold text-ink">Pick a time</h2>
                <SlotPicker
                  date={booking.date || today}
                  minDate={today}
                  onDateChange={booking.setDate}
                  slotsQuery={slotsQuery}
                  selectedStart={booking.slot?.start}
                  onSelectSlot={booking.setSlot}
                  mode={booking.staff === 'auto' ? 'auto' : 'specific'}
                />
              </div>
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
                <Row
                  label="Extras"
                  value={
                    booking.extras.length
                      ? booking.extras.map((e) => e.name).join(', ')
                      : 'None'
                  }
                />
                <Row
                  label="Barber"
                  value={
                    booking.staff === 'auto'
                      ? 'Auto-match'
                      : (staffQuery.data || []).find((s) => s._id === booking.staff)?.fullName ||
                        'Selected barber'
                  }
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

          {/* Nav */}
          {booking.step < 4 && (
            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={booking.back} disabled={booking.step === 0}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={booking.next} disabled={!canProceed}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          {booking.step === 4 && (
            <div className="mt-4">
              <Button variant="ghost" onClick={booking.back}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          )}
        </div>

        {/* Summary */}
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
              {booking.extras.map((e) => (
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
      </div>
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
