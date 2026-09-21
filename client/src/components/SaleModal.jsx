import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, ReceiptText } from 'lucide-react';

import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { useServices } from '../hooks/useServices';
import { useProducts } from '../hooks/useStock';
import salesApi from '../api/sales.api';
import { getApiErrorMessage } from '../config/axios';
import { formatMoney } from '../utils/formatMoney';

// Record a service/product sale (paper: barber "Record Sales Transactions").
// Prices come from the live catalog for display only — the server re-resolves
// every line, so the submitted payload carries ids + qty, never money.
export default function SaleModal({ open, onClose, onSaved }) {
  const qc = useQueryClient();
  const services = useServices();
  const products = useProducts();

  const [kind, setKind] = useState('service');
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState(1);
  const [lines, setLines] = useState([]);

  const catalog = kind === 'service' ? services.data || [] : products.data || [];
  const selected = catalog.find((c) => c._id === itemId);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.price * l.qty, 0),
    [lines]
  );

  const reset = () => {
    setKind('service');
    setItemId('');
    setQty(1);
    setLines([]);
  };

  const addLine = () => {
    if (!selected) {
      toast.error(`Pick a ${kind} first`);
      return;
    }
    const q = Math.max(1, Math.min(99, Number(qty) || 1));
    setLines((prev) => [
      ...prev,
      { kind, refId: selected._id, name: selected.name, price: selected.price, qty: q },
    ]);
    setItemId('');
    setQty(1);
  };

  const recordMutation = useMutation({
    mutationFn: () =>
      salesApi.record({
        items: lines.map(({ kind: k, refId, qty: q }) => ({ kind: k, refId, qty: q })),
      }),
    onSuccess: (res) => {
      toast.success(res?.message || 'Sale recorded');
      qc.invalidateQueries({ queryKey: ['staff', 'sales'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      onSaved?.();
      reset();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not record sale')),
  });

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose?.();
        reset();
      }}
      title="Record sale"
      description="Add everything you sold. Product stock goes down by itself."
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">
            Total <strong className="text-ink">{formatMoney(total)}</strong>
          </span>
          <Button
            onClick={() => recordMutation.mutate()}
            disabled={lines.length === 0}
            loading={recordMutation.isPending}
          >
            <ReceiptText className="h-4 w-4" />
            Record ({lines.length})
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-[130px_1fr_90px_auto] sm:items-end">
        <Select label="Type" value={kind} onChange={(e) => { setKind(e.target.value); setItemId(''); }}>
          <option value="service">Service</option>
          <option value="product">Product</option>
        </Select>
        <Select label="Item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
          <option value="">Select…</option>
          {catalog.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name} — {formatMoney(c.price)}
              {kind === 'product' ? ` (${c.stockQuantity ?? '?'} in stock)` : ''}
            </option>
          ))}
        </Select>
        <Input label="Qty" type="number" min={1} max={99} value={qty} onChange={(e) => setQty(e.target.value)} />
        <Button variant="outline" onClick={addLine}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {lines.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {lines.map((l, i) => (
            <li key={`${l.refId}-${i}`} className="flex items-start justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm">
              <span className="min-w-0 break-words" title={`${l.qty}x ${l.name}`}>
                <span className="mr-2 rounded bg-surface px-1.5 py-0.5 text-xs text-muted">{l.kind}</span>
                {l.qty}x {l.name}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <strong>{formatMoney(l.price * l.qty)}</strong>
                <button
                  type="button"
                  aria-label={`Remove ${l.name}`}
                  className="text-muted transition hover:text-danger"
                  onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">No items yet — add at least one to record the sale.</p>
      )}
    </Modal>
  );
}
