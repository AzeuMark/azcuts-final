import { forwardRef } from 'react';
import cn from '../utils/cn';
import { formatMoney } from '../utils/formatMoney';
import { formatDateTime } from '../utils/datetime';
import StatusBadge from './StatusBadge';

// Styled receipt rendered from the server's canonical receipt JSON. forwardRef so
// html2canvas can capture the node (see utils/receiptPng.js). Uses solid,
// computed colors (no backdrop-blur) so the PNG export is faithful.
const ReceiptCard = forwardRef(function ReceiptCard({ receipt, className }, ref) {
  if (!receipt) return null;
  const { shop, totals, customer, staff, service, extras = [], schedule, payment } = receipt;
  const currency = totals?.currency || 'PHP';
  const hasDiscount = Number(totals?.discountAmount) > 0;
  const hasTax = Number(totals?.taxAmount) > 0;

  return (
    <div
      ref={ref}
      className={cn(
        'w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-card',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-line bg-surface-2 p-5">
        <div className="flex items-center gap-3">
          <img src="/assets/website-logo.png" alt="" className="h-9 w-9 rounded-md object-contain" />
          <div>
            <p className="font-semibold leading-tight">{shop?.name || 'AzCuts'}</p>
            {shop?.address && <p className="text-xs text-muted">{shop.address}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted">Receipt</p>
          <p className="font-mono text-sm font-medium">{receipt.receiptNo}</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Issued</span>
          <span>{formatDateTime(receipt.issuedAt, receipt.timezone)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Schedule</span>
          <span>{formatDateTime(schedule?.start, receipt.timezone)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Customer</span>
          <span className="font-medium">{customer?.name || '—'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Barber</span>
          <span className="font-medium">
            {staff ? `${staff.name}${staff.nickname ? ` · ${staff.nickname}` : ''}` : 'Auto — awaiting staff'}
          </span>
        </div>

        <div className="border-t border-dashed border-line pt-4">
          <div className="flex items-center justify-between text-sm">
            <span>{service?.name}</span>
            <span className="tnum">{formatMoney(service?.price, currency)}</span>
          </div>
          {extras.map((e) => (
            <div key={e.id || e.name} className="mt-2 flex items-center justify-between text-sm text-muted">
              <span>+ {e.name}</span>
              <span className="tnum">{formatMoney(e.price, currency)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-dashed border-line pt-4 text-sm">
          <div className="flex items-center justify-between text-muted">
            <span>Subtotal</span>
            <span className="tnum">{formatMoney(totals?.subtotal, currency)}</span>
          </div>
          {hasDiscount && (
            <div className="flex items-center justify-between text-success">
              <span>Discount ({totals.discountPercent}%)</span>
              <span className="tnum">-{formatMoney(totals.discountAmount, currency)}</span>
            </div>
          )}
          {hasTax && (
            <div className="flex items-center justify-between text-muted">
              <span>Tax</span>
              <span className="tnum">{formatMoney(totals.taxAmount, currency)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-line pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tnum">{formatMoney(totals?.total, currency)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line pt-4">
          <span className="text-sm capitalize text-muted">
            {payment?.method || 'cash'} · {payment?.status || 'unpaid'}
          </span>
          <StatusBadge status={receipt.status} />
        </div>
      </div>
    </div>
  );
});

export default ReceiptCard;
