import { CalendarX2 } from 'lucide-react';
import cn from '../utils/cn';
import { formatTime } from '../utils/datetime';
import Spinner from './ui/Spinner';

/*
 * Date + time-slot grid. `slotsQuery` is a React Query result from useSlots.
 * mode 'specific' disables slots where the chosen barber is busy; 'auto' keeps
 * every open candidate selectable (a 0-availability slot books as "pending").
 */
export default function SlotPicker({
  date,
  minDate,
  onDateChange,
  slotsQuery,
  selectedStart,
  onSelectSlot,
  mode = 'auto',
}) {
  const { data, isLoading, isError } = slotsQuery || {};
  const slots = data?.slots || [];
  const closed = data?.closed;

  return (
    <div>
      <label htmlFor="slot-date" className="mb-1.5 block text-sm font-medium text-ink">
        Date
      </label>
      <input
        id="slot-date"
        type="date"
        value={date || ''}
        min={minDate}
        onChange={(e) => onDateChange?.(e.target.value)}
        className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />

      <div className="mt-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="text-brand" />
          </div>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-danger">Couldn&apos;t load available times. Try again.</p>
        ) : closed ? (
          <div className="flex flex-col items-center py-8 text-center">
            <CalendarX2 className="mb-2 h-8 w-8 text-muted" />
            <p className="text-sm text-muted">The shop is closed on this day. Please pick another date.</p>
          </div>
        ) : slots.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No open times left for this day.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {slots.map((slot) => {
              const free = slot.availableStaffCount > 0;
              const disabled = mode === 'specific' && !free;
              const selected = slot.start === selectedStart;
              return (
                <button
                  key={slot.start}
                  type="button"
                  disabled={disabled}
                  title={
                    mode === 'auto' && !free
                      ? 'No barber free at this time — your booking will be pending until one accepts'
                      : undefined
                  }
                  onClick={() => onSelectSlot?.(slot)}
                  className={cn(
                    'rounded-md border px-2 py-2 text-sm font-medium transition-colors focus-ring',
                    selected
                      ? 'border-brand bg-brand text-brand-fg'
                      : disabled
                        ? 'cursor-not-allowed border-line bg-surface-2 text-muted opacity-60'
                        : free
                          ? 'border-line bg-surface text-ink hover:border-brand hover:text-brand'
                          : 'border-dashed border-warning/50 bg-surface text-ink hover:border-warning'
                  )}
                >
                  {formatTime(slot.start)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!closed && slots.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          {mode === 'specific'
            ? 'Dashed times mean the barber is busy.'
            : 'Times shown are open for at least one barber; dashed times book as pending.'}
        </p>
      )}
    </div>
  );
}
