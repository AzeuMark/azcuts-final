import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Textarea from './ui/Textarea';
import stockApi from '../api/stock.api';
import { getApiErrorMessage } from '../config/axios';

const TYPES = [
  { value: 'usage', label: 'Usage — consumed in a service', sign: -1 },
  { value: 'sale', label: 'Sale — sold over the counter', sign: -1 },
  { value: 'stock_in', label: 'Stock in — delivery / restock', sign: 1 },
  { value: 'adjustment', label: 'Adjustment — correction', sign: 0 },
];

// Update stock for one product (paper: barber "Update Product Usage/Stock
// Information when authorized"). The server enforces the per-barber grant and
// the oversell guard — this form only collects quantity + type + reason.
export default function StockUpdateModal({ open, onClose, product, onSaved }) {
  const qc = useQueryClient();
  const [type, setType] = useState('usage');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');

  const typeDef = TYPES.find((t) => t.value === type);
  const signedQty = (Number(qty) || 0) * (typeDef.sign === 0 ? 1 : typeDef.sign);

  const updateMutation = useMutation({
    mutationFn: () =>
      stockApi.update({
        productId: product.product,
        change: type === 'adjustment' ? Number(qty) || 0 : Math.abs(Number(qty) || 0) * typeDef.sign,
        type,
        reason: reason.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success(res?.message || 'Stock updated');
      qc.invalidateQueries({ queryKey: ['stock'] });
      onSaved?.();
      setQty(1);
      setReason('');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not update stock')),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? `Update stock — ${product.name}` : 'Update stock'}
      description={
        product
          ? `On hand: ${product.stockQuantity} (low at ${product.lowStockThreshold})`
          : undefined
      }
      footer={
        <Button
          onClick={() => updateMutation.mutate()}
          loading={updateMutation.isPending}
          disabled={type === 'adjustment' ? Number(qty) === 0 : (Number(qty) || 0) <= 0}
        >
          Apply {signedQty > 0 ? `+${signedQty}` : signedQty}
        </Button>
      }
    >
      <div className="grid gap-3">
        <Select label="Movement type" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <Input
          label={type === 'adjustment' ? 'Change (+ in / − out)' : 'Quantity'}
          type="number"
          min={type === 'adjustment' ? undefined : 1}
          step={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <Textarea
          label={type === 'adjustment' ? 'Reason (required)' : 'Reason (optional)'}
          rows={2}
          maxLength={300}
          placeholder="e.g. Used 2 pumps for color service"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
    </Modal>
  );
}
